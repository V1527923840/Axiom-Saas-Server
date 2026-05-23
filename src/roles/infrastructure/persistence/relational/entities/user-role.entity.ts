import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'user_roles',
})
export class UserRoleEntity {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  userId: number;

  @Index()
  @Column()
  roleId: number;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  user?: UserEntity;

  @ManyToOne(() => RoleEntity, {
    onDelete: 'CASCADE',
  })
  role?: RoleEntity;

  @CreateDateColumn()
  createdAt: Date;
}
