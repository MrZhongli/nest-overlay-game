import { Module } from '@nestjs/common';
import { LifelinesController } from './lifelines.controller';
import { LifelinesService } from './lifelines.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [LifelinesController],
  providers: [LifelinesService],
})
export class LifelinesModule {}
