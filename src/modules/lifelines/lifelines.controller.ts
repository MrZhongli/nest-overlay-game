import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LifelinesService } from './lifelines.service';

import { IsString, IsNotEmpty } from 'class-validator';

class LifelineBodyDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;
}

@Controller('lifelines')
export class LifelinesController {
  constructor(private readonly lifelinesService: LifelinesService) {}

  /** Listar comodines de una sesión */
  @Get('session/:sessionId')
  getSessionLifelines(@Param('sessionId') sessionId: string) {
    return this.lifelinesService.getSessionLifelines(sessionId);
  }

  /** Usar 50/50: elimina 2 respuestas incorrectas y emite HIDE_ANSWERS */
  @Post('fifty-fifty')
  @HttpCode(HttpStatus.OK)
  fiftyFifty(@Body() body: LifelineBodyDto) {
    return this.lifelinesService.fiftyFifty(body.sessionId, body.questionId);
  }

  /** Usar Ask Audience: genera estadísticas ponderadas */
  @Post('ask-audience')
  @HttpCode(HttpStatus.OK)
  askAudience(@Body() body: LifelineBodyDto) {
    return this.lifelinesService.askAudience(body.sessionId, body.questionId);
  }

  /** Usar Phone a Friend: genera sugerencia de respuesta */
  @Post('phone-friend')
  @HttpCode(HttpStatus.OK)
  phoneAFriend(@Body() body: LifelineBodyDto) {
    return this.lifelinesService.phoneAFriend(body.sessionId, body.questionId);
  }
}
