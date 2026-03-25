import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateQuestionSetDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateQuestionSetDto {
  @IsOptional()
  @IsString()
  name?: string;
}
