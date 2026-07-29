import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'role',
})
export class RoleEntity extends EntityRelationalHelper {
  // Auto-generated since migration 1790200000000 — pre-migration
  // this column was a plain `integer NOT NULL` with no sequence,
  // so INSERTs that omitted an id failed with NOT NULL violations.
  // Seed scripts (Admin=1, User=2) still pick those values because
  // the migration primes the sequence at MAX(id), not 1.
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name?: string;

  // Added by the same migration. NOT NULL + UNIQUE matches
  // `CreateRoleDto.code` so the frontend's auto-generated slug
  // (e.g. `role_lxa8k2b3`) actually persists and won't collide.
  @Index()
  @Column({ length: 50, unique: true })
  code?: string;

  @Column({ nullable: true })
  description?: string;
}
