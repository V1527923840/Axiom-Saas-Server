import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export type ScrapeLogStatus = 'pending' | 'running' | 'success' | 'failed';

export class ScrapeLog {
  @Allow()
  @ApiProperty({ type: String })
  id: string;

  @Allow()
  @ApiProperty({ type: String })
  source: string;

  @Allow()
  @ApiProperty({ type: Date })
  targettime: Date;

  @Allow()
  @ApiProperty({ enum: ['pending', 'running', 'success', 'failed'] })
  status: ScrapeLogStatus;

  @Allow()
  @ApiProperty({ type: Number })
  filecount: number;

  @Allow()
  @ApiProperty({ type: Number })
  postcount: number;

  @Allow()
  @ApiProperty({ type: Date, nullable: true })
  latestposttime: Date | null;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  osspath: string | null;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  errormessage: string | null;

  @Allow()
  @ApiProperty({ type: Date })
  startedat: Date;

  @Allow()
  @ApiProperty({ type: Date, nullable: true })
  completedat: Date | null;

  @Allow()
  @ApiProperty({ type: Date })
  createdat: Date;

  @Allow()
  @ApiProperty({ type: Date })
  updatedat: Date;
}
