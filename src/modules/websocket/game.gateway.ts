import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import {
  GameEvent,
  ShowQuestionEvent,
  HideAnswersEvent,
  RevealCorrectEvent,
  GameFinishedEvent,
  OverlayStateEvent,
} from '../../common/events/game.events';

/**
 * 🎮 GAME GATEWAY - Corazón del sistema realtime
 *
 * Rooms:
 *  - "game:{sessionId}" → sala por partida
 *  - "overlay"          → sala del overlay de OBS (público, sin auth)
 *  - "admin"            → sala del panel de control
 *
 * El overlay de OBS se une a ambas: "overlay" y "game:{sessionId}"
 */
@WebSocketGateway({
  namespace: '/ws/game',
  cors: {
    origin: '*', // En producción: origen del OBS y del panel admin
    methods: ['GET', 'POST'],
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway initialized on /ws/game');
  }

  handleConnection(client: Socket) {
    const role = client.handshake.query.role as string;
    const sessionId = client.handshake.query.sessionId as string;

    this.logger.log(`Client connected: ${client.id} | role=${role}`);

    // El overlay de OBS se une automáticamente
    if (role === 'overlay') {
      void client.join('overlay');
      if (sessionId) {
        void client.join(`game:${sessionId}`);
      }
    }

    // Panel admin
    if (role === 'admin') {
      void client.join('admin');
      if (sessionId) {
        void client.join(`game:${sessionId}`);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─────────────────────────────────────────────
  // Métodos de emisión para los servicios
  // ─────────────────────────────────────────────

  emitShowQuestion(sessionId: string, payload: ShowQuestionEvent) {
    this.server.to(`game:${sessionId}`).emit(GameEvent.SHOW_QUESTION, payload);
  }

  emitHideAnswers(sessionId: string, payload: HideAnswersEvent) {
    this.server.to(`game:${sessionId}`).emit(GameEvent.HIDE_ANSWERS, payload);
  }

  emitRevealCorrect(sessionId: string, payload: RevealCorrectEvent) {
    this.server.to(`game:${sessionId}`).emit(GameEvent.REVEAL_CORRECT, payload);
  }

  emitGameFinished(sessionId: string, payload: GameFinishedEvent) {
    this.server.to(`game:${sessionId}`).emit(GameEvent.GAME_FINISHED, payload);
  }

  emitGameStarted(sessionId: string) {
    this.server
      .to(`game:${sessionId}`)
      .emit(GameEvent.GAME_STARTED, { sessionId });
  }

  /** Emite el estado completo del overlay para reconexión de OBS */
  emitOverlayState(payload: OverlayStateEvent) {
    this.server.to('overlay').emit(GameEvent.OVERLAY_STATE, payload);
  }

  // ─────────────────────────────────────────────
  // Listeners de clientes (admin panel vía WS)
  // ─────────────────────────────────────────────

  @SubscribeMessage('JOIN_GAME')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    void client.join(`game:${data.sessionId}`);
    this.logger.log(`Client ${client.id} joined room game:${data.sessionId}`);
    return { event: 'JOINED', data: { sessionId: data.sessionId } };
  }

  @SubscribeMessage('ADMIN_SYNC')
  handleAdminSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() state: any,
  ) {
    // Reenviar el estado a todos los clientes (Overlay y otros Admins)
    this.server.emit(GameEvent.OVERLAY_STATE, state);
    this.logger.log(`Estado sincronizado recibido del admin: ${client.id}`);
    return { event: 'SYNC_OK' };
  }
}
