import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../websocket/game.gateway';
import { GameEvent, HideAnswersEvent } from '../../common/events/game.events';
import { LifelineType } from '@prisma/client';

@Injectable()
export class LifelinesService {
  private readonly logger = new Logger(LifelinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: GameGateway,
  ) {}

  // ─────────────────────────────────────────────
  // 50 / 50
  // ─────────────────────────────────────────────
  /**
   * Elimina 2 respuestas incorrectas al azar.
   * Emite HIDE_ANSWERS con los IDs eliminados para el overlay.
   */
  async fiftyFifty(sessionId: string, questionId: string) {
    await this.validateLifeline(sessionId, LifelineType.FIFTY_FIFTY);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${questionId} no encontrada`);
    }

    // Filtrar incorrectas y elegir 2 al azar
    const incorrectAnswers = question.answers.filter((a) => !a.isCorrect);

    if (incorrectAnswers.length < 2) {
      throw new BadRequestException(
        'La pregunta debe tener al menos 2 respuestas incorrectas para usar 50/50',
      );
    }

    const shuffled = incorrectAnswers.sort(() => Math.random() - 0.5);
    const hiddenAnswerIds = shuffled.slice(0, 2).map((a) => a.id);

    // Marcar comodín como usado
    await this.markLifelineUsed(sessionId, LifelineType.FIFTY_FIFTY);

    // Actualizar OverlayState con las respuestas ocultas
    await this.prisma.overlayState.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        sessionId,
        currentQuestionId: questionId,
        revealAnswer: false,
        hiddenAnswerIds,
      },
      update: { hiddenAnswerIds },
    });

    const payload: HideAnswersEvent = {
      type: GameEvent.HIDE_ANSWERS,
      sessionId,
      hiddenAnswerIds,
    };

    this.gateway.emitHideAnswers(sessionId, payload);

    this.logger.log(
      `50/50 used | Session: ${sessionId} | Hidden: ${hiddenAnswerIds.join(', ')}`,
    );

    return payload;
  }

  // ─────────────────────────────────────────────
  // ASK AUDIENCE
  // ─────────────────────────────────────────────
  /**
   * Simula la votación del público.
   * En una implementación real, esto podría integrarse con Twitch Polls.
   * Por ahora genera estadísticas ponderadas hacia la respuesta correcta.
   */
  async askAudience(sessionId: string, questionId: string) {
    await this.validateLifeline(sessionId, LifelineType.ASK_AUDIENCE);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${questionId} no encontrada`);
    }

    // Generar estadísticas simuladas (la correcta tiene mayor probabilidad)
    const stats = this.generateAudienceStats(question.answers);

    await this.markLifelineUsed(sessionId, LifelineType.ASK_AUDIENCE);

    this.logger.log(`Ask Audience used | Session: ${sessionId}`);

    return { sessionId, questionId, audienceStats: stats };
  }

  // ─────────────────────────────────────────────
  // PHONE A FRIEND
  // ─────────────────────────────────────────────
  /**
   * Simula la llamada a un amigo.
   * Genera un mensaje con cierta probabilidad de acertar.
   */
  async phoneAFriend(sessionId: string, questionId: string) {
    await this.validateLifeline(sessionId, LifelineType.PHONE_FRIEND);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${questionId} no encontrada`);
    }

    const correctAnswer = question.answers.find((a) => a.isCorrect);
    const isConfident = Math.random() > 0.25; // 75% de confianza en la respuesta

    const suggestedAnswer = isConfident
      ? correctAnswer
      : question.answers[Math.floor(Math.random() * question.answers.length)];

    await this.markLifelineUsed(sessionId, LifelineType.PHONE_FRIEND);

    this.logger.log(`Phone a Friend used | Session: ${sessionId}`);

    return {
      sessionId,
      questionId,
      friend: {
        confidence: isConfident ? 'alta' : 'baja',
        suggestedAnswerId: suggestedAnswer?.id,
        message: isConfident
          ? `Creo que es "${suggestedAnswer?.text}", estoy bastante seguro.`
          : `Hmm... creo que podría ser "${suggestedAnswer?.text}", pero no estoy seguro.`,
      },
    };
  }

  // ─────────────────────────────────────────────
  // LISTAR COMODINES DE SESIÓN
  // ─────────────────────────────────────────────

  async getSessionLifelines(sessionId: string) {
    const lifelines = await this.prisma.lifelineUsage.findMany({
      where: { sessionId },
    });

    if (!lifelines.length) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada o sin comodines`);
    }

    return lifelines;
  }

  // ─────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────

  private async validateLifeline(sessionId: string, type: LifelineType) {
    const lifeline = await this.prisma.lifelineUsage.findFirst({
      where: { sessionId, type },
    });

    if (!lifeline) {
      throw new NotFoundException(
        `Comodín ${type} no encontrado para la sesión ${sessionId}`,
      );
    }

    if (lifeline.used) {
      throw new BadRequestException(
        `El comodín ${type} ya fue utilizado en esta sesión`,
      );
    }

    return lifeline;
  }

  private async markLifelineUsed(sessionId: string, type: LifelineType) {
    return this.prisma.lifelineUsage.updateMany({
      where: { sessionId, type },
      data: { used: true, usedAt: new Date() },
    });
  }

  private generateAudienceStats(
    answers: { id: string; text: string; isCorrect: boolean }[],
  ) {
    // La respuesta correcta recibe entre 45-75% de los "votos"
    const correctPercentage = 45 + Math.floor(Math.random() * 30);
    const remaining = 100 - correctPercentage;
    const incorrectCount = answers.filter((a) => !a.isCorrect).length;

    const stats: Record<string, number> = {};

    answers.forEach((answer) => {
      if (answer.isCorrect) {
        stats[answer.id] = correctPercentage;
      } else {
        // Distribuir el restante entre las incorrectas
        stats[answer.id] = Math.floor(remaining / incorrectCount);
      }
    });

    return stats;
  }
}
