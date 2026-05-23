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
  @Column({ type: 'int', nullable: false, name: 'user_id' })
  userId: number;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Index()
  @Column({ type: 'uuid', nullable: false, name: 'menu_id' })
  menuId: string;

  @ManyToOne(() => MenuEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu?: MenuEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'purchased_at' })
  purchasedAt: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;
}
