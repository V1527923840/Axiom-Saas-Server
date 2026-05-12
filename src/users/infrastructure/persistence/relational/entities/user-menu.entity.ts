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
import { UserEntity } from './user.entity';
import { MenuEntity } from '../../../../../menus/infrastructure/persistence/relational/entities/menu.entity';

@Entity({
  name: 'user_menu',
})
@Unique(['userId', 'menuId'])
export class UserMenuEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  menuId: string;

  @ManyToOne(() => MenuEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu?: MenuEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  purchasedAt: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
