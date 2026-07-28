import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async run() {
    // Mirror migration 1790300000000's three guarantees so the seed
    // and the migration agree on what "canonical" looks like:
    //
    //   1. Pre-clear: if any OTHER row already holds the canonical
    //      code (e.g. an operator-renamed row), rename its code to
    //      `<code>_legacy` first so the seed's later UPDATE/INSERT
    //      on the canonical row can't trip UQ_role_code.
    //   2. Idempotent guard: only rewrite name/description when the
    //      existing code differs from canonical. A re-run on an
    //      already-canonical row is a no-op, and an operator's
    //      renamed display name survives.
    //   3. setval resync: after writing the explicit ids, bump
    //      role_id_seq past MAX(id) so future implicit-id INSERTs
    //      (e.g. POST /v1/roles) don't immediately collide.

    const rows: Array<{
      id: RoleEnum;
      code: string;
      name: string;
      description: string;
    }> = [
      {
        id: RoleEnum.admin,
        code: 'super_admin',
        name: '超级管理员',
        description: '拥有全部菜单权限',
      },
      {
        id: RoleEnum.user,
        code: 'admin',
        name: 'Admin',
        description: '管理员',
      },
    ];

    for (const r of rows) {
      // (1) pre-clear any other row already holding this code.
      await this.repository.manager.query(
        `UPDATE "role" SET "code" = "code" || '_legacy' WHERE "code" = $1 AND "id" <> $2`,
        [r.code, r.id],
      );

      const existing = await this.repository.findOne({
        where: { id: r.id },
      });

      if (existing) {
        // (2) idempotent guard: only rewrite when the current code
        // differs from canonical.
        if (existing.code !== r.code) {
          existing.code = r.code;
          existing.name = r.name;
          existing.description = r.description;
          await this.repository.save(existing);
        }
      } else {
        await this.repository.save(
          this.repository.create({
            id: r.id,
            name: r.name,
            code: r.code,
            description: r.description,
          }),
        );
      }
    }

    // (3) resync role_id_seq past the explicit ids we just wrote so
    // implicit-id INSERTs (POST /v1/roles) don't collide with id=1/2.
    await this.repository.manager.query(
      `SELECT setval('"role_id_seq"', GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "role"), 1))`,
    );
  }
}
