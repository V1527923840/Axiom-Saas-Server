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
  @Column({ name: 'plan_id', type: 'uuid', nullable: false })
  planId: string;

  @ManyToOne(() => PlanEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: PlanEntity;

  @Index()
  @Column({ name: 'menu_id', type: 'uuid', nullable: false })
  menuId: string;

  @ManyToOne(() => MenuEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu?: MenuEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
