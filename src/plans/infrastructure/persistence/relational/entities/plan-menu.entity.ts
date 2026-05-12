import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { PlanEntity } from './plan.entity';
import { MenuEntity } from '../../../../../menus/infrastructure/persistence/relational/entities/menu.entity';

@Entity({
  name: 'plan_menu',
})
@Unique(['planId', 'menuId'])
export class PlanMenuEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  planId: string;

  @ManyToOne(() => PlanEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan?: PlanEntity;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  menuId: string;

  @ManyToOne(() => MenuEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu?: MenuEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
