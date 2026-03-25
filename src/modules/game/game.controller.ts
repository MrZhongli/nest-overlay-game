import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { GameService } from './game.service';
import { CreateSessionDto } from '../../common/dto/session.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ─── SESIÓN ───────────────────────────────────

  /** Crear una nueva partida (requiere un QuestionSet) */
  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() dto: CreateSessionDto) {
    return this.gameService.createSession(dto);
  }

  /** Obtener datos de una sesión específica */
  @Get('session/:id')
  getSession(@Param('id') id: string) {
    return this.gameService.getSession(id);
  }

  /** Iniciar el juego (WAITING → PLAYING) */
  @Post('session/:id/start')
  @HttpCode(HttpStatus.OK)
  startSession(@Param('id') id: string) {
    return this.gameService.startSession(id);
  }

  /** Pasar a la siguiente pregunta y emitir SHOW_QUESTION */
  @Post('session/:id/next')
  @HttpCode(HttpStatus.OK)
  nextQuestion(@Param('id') id: string) {
    return this.gameService.nextQuestion(id);
  }

  /** Ver la pregunta actualmente en juego (para el admin panel) */
  @Get('session/:id/current-question')
  getCurrentQuestion(@Param('id') id: string) {
    return this.gameService.getCurrentQuestion(id);
  }

  /** Revelar la respuesta correcta en el overlay */
  @Post('session/:id/reveal-answer')
  @HttpCode(HttpStatus.OK)
  revealAnswer(@Param('id') id: string) {
    return this.gameService.revealAnswer(id);
  }

  /** Terminar la partida */
  @Post('session/:id/finish')
  @HttpCode(HttpStatus.OK)
  finishSession(
    @Param('id') id: string,
    @Query('won') won?: string,
  ) {
    return this.gameService.finishSession(id, won === 'true');
  }

  // ─── OVERLAY STATE (Público - para OBS) ───────

  /**
   * Endpoint público para que OBS recupere el estado del juego
   * tras reconectar el browser source.
   * No requiere autenticación (@Public)
   */
  @Public()
  @Get('overlay/state')
  getOverlayState() {
    return this.gameService.getOverlayState();
  }
}
