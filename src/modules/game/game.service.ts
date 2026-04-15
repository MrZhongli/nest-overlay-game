import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../websocket/game.gateway';
import { QuestionsService } from '../questions/questions.service';
import { CreateSessionDto } from '../../common/dto/session.dto';
import { GameStatus, LifelineType } from '@prisma/client';
import {
  GameEvent,
  QuestionPayload,
  AnswerPayload,
  ShowQuestionEvent,
  RevealCorrectEvent,
  GameFinishedEvent,
} from '../../common/events/game.events';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: GameGateway,
    private readonly questionsService: QuestionsService,
  ) {}

  // ─────────────────────────────────────────────
  // CREAR SESIÓN (POST /game/session)
  // ─────────────────────────────────────────────

  async createSession(dto: CreateSessionDto) {
    // Verificar que el QuestionSet existe
    const set = await this.prisma.questionSet.findUnique({
      where: { id: dto.setId },
    });

    if (!set) {
      throw new NotFoundException(`QuestionSet ${dto.setId} no encontrado`);
    }

    // Si hay una sesión activa, la cerramos automáticamente
    const activeSession = await this.prisma.gameSession.findFirst({
      where: { status: { in: [GameStatus.WAITING, GameStatus.PLAYING] } },
    });

    if (activeSession) {
      await this.prisma.gameSession.update({
        where: { id: activeSession.id },
        data: { status: GameStatus.FINISHED },
      });
      await this.prisma.overlayState.upsert({
        where: { id: 'main' },
        create: { id: 'main', sessionId: null, currentQuestionId: null, revealAnswer: false, hiddenAnswerIds: [] },
        update: { sessionId: null, currentQuestionId: null, revealAnswer: false, hiddenAnswerIds: [] },
      });
      this.logger.log(`Auto-finalized previous session: ${activeSession.id}`);
    }

    // Crear sesión con los 3 comodines disponibles
    const session = await this.prisma.gameSession.create({
      data: {
        setId: dto.setId,
        status: GameStatus.WAITING,
        currentLevel: 1,
        lifelines: {
          create: [
            { type: LifelineType.FIFTY_FIFTY, used: false },
            { type: LifelineType.ASK_AUDIENCE, used: false },
            { type: LifelineType.PHONE_FRIEND, used: false },
          ],
        },
      },
      include: { lifelines: true, set: true },
    });

    this.logger.log(`GameSession created: ${session.id} | Set: "${set.name}"`);
    return session;
  }

  // ─────────────────────────────────────────────
  // INICIAR JUEGO (POST /game/session/:id/start)
  // ─────────────────────────────────────────────

  async startSession(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status !== GameStatus.WAITING) {
      throw new BadRequestException(
        `La sesión no está en estado WAITING. Estado actual: ${session.status}`,
      );
    }

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: GameStatus.PLAYING },
    });

    this.gateway.emitGameStarted(sessionId);

    this.logger.log(`GameSession started: ${sessionId}`);
    return { sessionId, status: GameStatus.PLAYING };
  }

  // ─────────────────────────────────────────────
  // SIGUIENTE PREGUNTA (POST /game/session/:id/next)
  // ─────────────────────────────────────────────
  /**
   * Lógica principal del flujo WWTBAM:
   * 1. Incrementa el nivel actual
   * 2. Busca (aleatoriamente si hay varias) la pregunta del nivel
   * 3. Actualiza el estado de la sesión y del overlay
   * 4. Emite SHOW_QUESTION por WebSocket
   */

  async nextQuestion(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `La sesión no está en estado PLAYING. Estado actual: ${session.status}`,
      );
    }

    const nextLevel = session.currentLevel;

    // Buscar pregunta aleatoria del nivel actual
    let question;
    try {
      question = await this.questionsService.findByLevel(
        session.setId,
        nextLevel,
      );
    } catch (err) {
      if (err instanceof NotFoundException) {
        // Si ya no hay preguntas para el siguiente nivel, asumimos que completó el juego existosamente (WON)
        this.logger.log(`No more questions for level ${nextLevel} in session ${sessionId}. Player wins automatically.`);
        return this.finishSession(sessionId, true);
      }
      throw err;
    }

    // Actualizar sesión con la pregunta actual
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentLevel: nextLevel,
        currentQuestionId: question.id,
        revealAnswer: false,
      },
    });

    // Actualizar OverlayState para reconexión de OBS
    await this.syncOverlayState(sessionId, question.id, false, []);

    // Construir payload para el overlay (SIN revelar cuál es correcta)
    const payload: ShowQuestionEvent = {
      type: GameEvent.SHOW_QUESTION,
      sessionId,
      question: this.toQuestionPayload(question),
    };

    this.gateway.emitShowQuestion(sessionId, payload);

    this.logger.log(
      `Level ${nextLevel} | Question: "${question.text.slice(0, 50)}..."`,
    );

    return payload;
  }

  // ─────────────────────────────────────────────
  // OBTENER PREGUNTA ACTUAL (GET /game/session/:id/current-question)
  // ─────────────────────────────────────────────

  async getCurrentQuestion(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (!session.currentQuestionId) {
      throw new NotFoundException('No hay pregunta activa en esta sesión');
    }

    const question = await this.questionsService.findOne(
      session.currentQuestionId,
    );

    return {
      sessionId,
      currentLevel: session.currentLevel,
      question: this.toQuestionPayload(question),
      revealAnswer: session.revealAnswer,
    };
  }

  // ─────────────────────────────────────────────
  // REVELAR RESPUESTA CORRECTA (POST /game/session/:id/reveal-answer)
  // ─────────────────────────────────────────────

  async revealAnswer(sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);

    if (!session.currentQuestionId) {
      throw new BadRequestException('No hay pregunta activa');
    }

    const question = await this.questionsService.findOne(
      session.currentQuestionId,
    );

    const correctAnswer = question.answers.find((a) => a.isCorrect);

    if (!correctAnswer) {
      throw new BadRequestException('La pregunta no tiene respuesta correcta configurada');
    }

    // Marcar sesión como respuesta revelada
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { revealAnswer: true },
    });

    // Avanzar nivel para la siguiente pregunta
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { currentLevel: session.currentLevel + 1 },
    });

    // Sync overlay state
    await this.syncOverlayState(sessionId, question.id, true, []);

    const payload: RevealCorrectEvent = {
      type: GameEvent.REVEAL_CORRECT,
      sessionId,
      correctAnswerId: correctAnswer.id,
    };

    this.gateway.emitRevealCorrect(sessionId, payload);

    this.logger.log(
      `Answer revealed for session ${sessionId}: answer ${correctAnswer.id}`,
    );

    return payload;
  }

  // ─────────────────────────────────────────────
  // TERMINAR JUEGO (POST /game/session/:id/finish)
  // ─────────────────────────────────────────────

  async finishSession(sessionId: string, won: boolean = false) {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status === GameStatus.FINISHED || session.status === GameStatus.WON || session.status === GameStatus.LOST) {
      throw new BadRequestException('La sesión ya ha finalizado');
    }

    const newStatus = won ? GameStatus.WON : GameStatus.FINISHED;

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: newStatus },
    });

    // Limpiar overlay state
    await this.prisma.overlayState.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        sessionId: null,
        currentQuestionId: null,
        revealAnswer: false,
        hiddenAnswerIds: [],
      },
      update: {
        sessionId: null,
        currentQuestionId: null,
        revealAnswer: false,
        hiddenAnswerIds: [],
      },
    });

    const payload: GameFinishedEvent = {
      type: GameEvent.GAME_FINISHED,
      sessionId,
      finalLevel: session.currentLevel,
      status: newStatus,
    };

    this.gateway.emitGameFinished(sessionId, payload);

    this.logger.log(
      `GameSession finished: ${sessionId} | Status: ${newStatus} | Level: ${session.currentLevel}`,
    );

    return payload;
  }

  // ─────────────────────────────────────────────
  // GET SESIÓN (GET /game/session/:id)
  // ─────────────────────────────────────────────

  async getSession(sessionId: string) {
    return this.getSessionOrThrow(sessionId);
  }

  // ─────────────────────────────────────────────
  // GET ESTADO DEL OVERLAY (para reconexión OBS)
  // ─────────────────────────────────────────────

  async getOverlayState() {
    const state = await this.prisma.overlayState.findUnique({
      where: { id: 'main' },
    });

    if (!state) {
      return {
        type: GameEvent.OVERLAY_STATE,
        sessionId: null,
        currentQuestionId: null,
        revealAnswer: false,
        hiddenAnswerIds: [],
      };
    }

    return {
      type: GameEvent.OVERLAY_STATE,
      sessionId: state.sessionId,
      currentQuestionId: state.currentQuestionId,
      revealAnswer: state.revealAnswer,
      hiddenAnswerIds: (state.hiddenAnswerIds as string[]) ?? [],
    };
  }

  // ─────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────

  private async getSessionOrThrow(sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { lifelines: true },
    });

    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }

    return session;
  }

  /**
   * Construye el payload de pregunta para el overlay.
   * IMPORTANTE: NO incluye isCorrect en las respuestas
   * para que el overlay no pueda hacer trampa.
   */
  private toQuestionPayload(question: {
    id: string;
    text: string;
    level: number;
    category?: string | null;
    answers: { id: string; text: string; isCorrect: boolean }[];
  }) {
    const answers: AnswerPayload[] = question.answers.map((a) => ({
      id: a.id,
      text: a.text,
      // isCorrect NO se expone al overlay
    }));

    const payload: QuestionPayload = {
      id: question.id,
      text: question.text,
      level: question.level,
      ...(question.category && { category: question.category }),
      answers,
    };

    return payload;
  }

  private async syncOverlayState(
    sessionId: string,
    currentQuestionId: string | null,
    revealAnswer: boolean,
    hiddenAnswerIds: string[],
  ) {
    await this.prisma.overlayState.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        sessionId,
        currentQuestionId,
        revealAnswer,
        hiddenAnswerIds,
      },
      update: {
        sessionId,
        currentQuestionId,
        revealAnswer,
        hiddenAnswerIds,
      },
    });
  }
}
