import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { LifelineType } from '@prisma/client';

export class UseLifelineDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsEnum(LifelineType)
  type: LifelineType;
}
