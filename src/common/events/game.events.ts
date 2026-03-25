// ─────────────────────────────────────────────
// WebSocket Events - Contrato compartido entre
// Gateway y los servicios que emiten eventos
// ─────────────────────────────────────────────

export enum GameEvent {
  // Emitidos por el servidor → OBS Overlay
  SHOW_QUESTION = 'SHOW_QUESTION',
  HIDE_ANSWERS = 'HIDE_ANSWERS',        // Resultado de FIFTY_FIFTY
  REVEAL_CORRECT = 'REVEAL_CORRECT',    // Revelar respuesta correcta
  GAME_STARTED = 'GAME_STARTED',
  GAME_FINISHED = 'GAME_FINISHED',
  OVERLAY_STATE = 'OVERLAY_STATE',      // Estado actual para reconexión de OBS

  // Emitidos por el admin panel → servidor
  NEXT_QUESTION = 'NEXT_QUESTION',
  USE_LIFELINE = 'USE_LIFELINE',
  FINISH_GAME = 'FINISH_GAME',
}

export interface QuestionPayload {
  id: string;
  text: string;
  level: number;
  category?: string;
  answers: AnswerPayload[];
}

export interface AnswerPayload {
  id: string;
  text: string;
}

export interface ShowQuestionEvent {
  type: GameEvent.SHOW_QUESTION;
  sessionId: string;
  question: QuestionPayload;
}

export interface HideAnswersEvent {
  type: GameEvent.HIDE_ANSWERS;
  sessionId: string;
  hiddenAnswerIds: string[]; // 2 respuestas incorrectas eliminadas por 50/50
}

export interface RevealCorrectEvent {
  type: GameEvent.REVEAL_CORRECT;
  sessionId: string;
  correctAnswerId: string;
}

export interface GameFinishedEvent {
  type: GameEvent.GAME_FINISHED;
  sessionId: string;
  finalLevel: number;
}

export interface OverlayStateEvent {
  type: GameEvent.OVERLAY_STATE;
  sessionId: string | null;
  currentQuestionId: string | null;
  revealAnswer: boolean;
  hiddenAnswerIds: string[];
}
