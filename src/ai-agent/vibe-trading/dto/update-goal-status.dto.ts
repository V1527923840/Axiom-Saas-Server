import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateGoalStatusDto {
  @IsString()
  goal_id!: string;

  @IsString()
  expected_goal_id!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsArray()
  audit?: unknown[];

  @IsOptional()
  @IsString()
  recap?: string;
}
