import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuestionSetsService } from './question-sets.service';
import { CreateQuestionSetDto } from '../../common/dto/question-set.dto';

@Controller('question-sets')
export class QuestionSetsController {
  constructor(private readonly questionSetsService: QuestionSetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateQuestionSetDto) {
    return this.questionSetsService.create(dto);
  }

  @Get()
  findAll() {
    return this.questionSetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionSetsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.questionSetsService.remove(id);
  }
}
