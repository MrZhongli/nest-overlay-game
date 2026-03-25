import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionSetDto } from '../../common/dto/question-set.dto';

@Injectable()
export class QuestionSetsService {
  private readonly logger = new Logger(QuestionSetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionSetDto) {
    const set = await this.prisma.questionSet.create({
      data: { name: dto.name },
    });
    this.logger.log(`QuestionSet created: ${set.id} - "${set.name}"`);
    return set;
  }

  async findAll() {
    return this.prisma.questionSet.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const set = await this.prisma.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          include: { answers: true },
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!set) {
      throw new NotFoundException(`QuestionSet ${id} no encontrado`);
    }

    return set;
  }

  async remove(id: string) {
    await this.findOne(id); // verifica existencia
    return this.prisma.questionSet.delete({ where: { id } });
  }
}