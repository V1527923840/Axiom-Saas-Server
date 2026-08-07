import { IsOptional, IsString } from 'class-validator';

export class UpdateGoalDto {
  @IsString()
  goal_id!: string;

  @IsString()
  expected_goal_id!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  ui_summary?: string;
}
