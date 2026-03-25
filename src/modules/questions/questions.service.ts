import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from '../../common/dto/question.dto';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionDto) {
    // Verificar que el set existe
    const set = await this.prisma.questionSet.findUnique({
      where: { id: dto.setId },
    });

    if (!set) {
      throw new NotFoundException(`QuestionSet ${dto.setId} no encontrado`);
    }

    // Validar que exactamente 1 respuesta sea correcta
    const correctCount = dto.answers.filter((a) => a.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Debe haber exactamente 1 respuesta correcta');
    }

    const question = await this.prisma.question.create({
      data: {
        text: dto.text,
        level: dto.level,
        category: dto.category,
        setId: dto.setId,
        answers: {
          create: dto.answers.map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        },
      },
      include: { answers: true },
    });

    this.logger.log(`Question created: ${question.id} - Level ${question.level}`);
    return question;
  }

  async findAll(setId?: string) {
    return this.prisma.question.findMany({
      where: setId ? { setId } : undefined,
      include: { answers: true },
      orderBy: { level: 'asc' },
    });
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { answers: true },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.text && { text: dto.text }),
        ...(dto.level && { level: dto.level }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
      include: { answers: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.question.delete({ where: { id } });
  }

  /**
   * Obtiene la pregunta del nivel actual dentro de un QuestionSet.
   * Selecciona aleatoriamente si hay varias del mismo nivel.
   */
  async findByLevel(setId: string, level: number) {
    const questions = await this.prisma.question.findMany({
      where: { setId, level },
      include: { answers: true },
    });

    if (questions.length === 0) {
      throw new NotFoundException(
        `No hay preguntas para el nivel ${level} en el set ${setId}`,
      );
    }

    // Selección aleatoria si hay múltiples preguntas del mismo nivel
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }
}
