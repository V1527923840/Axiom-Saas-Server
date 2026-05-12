import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export type MenuStatus = 'active' | 'inactive';

export class Menu {
  @Allow()
  @ApiProperty({ type: String })
  id: string;

  @Allow()
  @ApiProperty({ type: String })
  name: string;

  @Allow()
  @ApiProperty({ type: String })
  code: string;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  icon: string | null;

  @Allow()
  @ApiProperty({ type: String })
  path: string;

  @Allow()
  @ApiProperty({ type: String, nullable: true })
  parentId: string | null;

  @Allow()
  @ApiProperty({ type: Number })
  sortOrder: number;

  @Allow()
  @ApiProperty({ enum: ['active', 'inactive'] })
  status: MenuStatus;

  @Allow()
  @ApiProperty()
  createdAt: Date;

  @Allow()
  @ApiProperty()
  updatedAt: Date;

  children?: Menu[];
}
