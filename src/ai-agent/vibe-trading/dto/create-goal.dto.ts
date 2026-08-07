import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  objective!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];

  @IsOptional()
  @IsString()
  ui_summary?: string;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsOptional()
  @IsString()
  risk_tier?:
    | 'research_general'
    | 'market_specific_short_term'
    | 'personalized_advice_or_position_sizing'
    | 'live_trading_or_execution';

  @IsOptional()
  @IsInt()
  token_budget?: number;

  @IsOptional()
  @IsInt()
  turn_budget?: number;

  @IsOptional()
  @IsInt()
  time_budget_seconds?: number;
}
