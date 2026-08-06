import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  agentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
