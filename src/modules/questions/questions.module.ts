import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';

@Module({
  controllers: [QuestionsController, QuestionSetsController],
  providers: [QuestionsService, QuestionSetsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
