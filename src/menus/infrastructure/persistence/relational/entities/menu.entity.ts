import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'menu',
})
export class MenuEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: String, length: 100, nullable: false })
  name: string;

  @Index()
  @Column({ type: String, length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: String, length: 50, nullable: true })
  icon: string | null;

  @Column({ type: String, length: 255, nullable: false })
  path: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => MenuEntity, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: MenuEntity | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Index()
  @Column({ type: String, length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
