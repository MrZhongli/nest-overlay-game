import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [WebsocketModule, QuestionsModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
