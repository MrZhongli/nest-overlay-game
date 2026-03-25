import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsBoolean, ValidateNested, Min, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnswerDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @Min(1)
  @Max(15)
  level: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  @IsNotEmpty()
  setId: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  level?: number;

  @IsOptional()
  @IsString()
  category?: string;
}
