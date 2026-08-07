import { IsArray, IsOptional, IsString } from 'class-validator';

export class AddGoalEvidenceDto {
  @IsString()
  goal_id!: string;

  @IsString()
  expected_goal_id!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  criterion_id?: string;

  @IsOptional()
  @IsString()
  claim_id?: string;

  @IsOptional()
  @IsString()
  evidence_type?: string;

  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @IsOptional()
  @IsString()
  run_id?: string;

  @IsOptional()
  @IsString()
  source_provider?: string;

  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  source_uri?: string;

  @IsOptional()
  @IsArray()
  symbol_universe?: string[];

  @IsOptional()
  @IsArray()
  benchmark?: string[];

  @IsOptional()
  @IsString()
  timeframe?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  assumptions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  artifact_path?: string;

  @IsOptional()
  @IsString()
  artifact_hash?: string;

  @IsOptional()
  @IsString()
  data_as_of?: string;

  @IsOptional()
  @IsString()
  confidence?: string;

  @IsOptional()
  @IsString()
  caveat?: string;

  @IsOptional()
  @IsArray()
  contradicts_claim_ids?: string[];
}
