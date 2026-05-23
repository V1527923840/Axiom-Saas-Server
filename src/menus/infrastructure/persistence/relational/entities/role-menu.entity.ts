import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { MenuEntity } from './menu.entity';

@Entity({
  name: 'role_menu',
})
export class RoleMenuEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int', nullable: false })
  roleId: number;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  menuId: string;

  @ManyToOne(() => MenuEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu?: MenuEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
