import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Patch menu rows whose `icon` value points to a Lucide name that does
 * not exist in the lucide-react package. When a name does not exist,
 * app-sidebar.tsx falls back to the generic `Menu` icon — the
 * operator can confirm by inspecting the rendered sidebar (every
 * "broken" icon row will look identical to the 菜单管理 menu).
 *
 * Detected after running 1790400000000-UpdateMenuIcons:
 *
 *   - industry-chains → Factory     (Factory IS a valid Lucide name;
 *     only needs to be added to the frontend iconMap; this migration
 *     is a defensive no-op for this row)
 *   - roles           → Roles       (Roles is NOT a valid Lucide
 *     name; rewrite to ShieldCheck, the value the previous
 *     1790400000000-UpdateMenuIcons migration would have set had the
 *     row still carried the seeded 'Shield' icon. Operator's hand
 *     edit is overridden because their chosen name does not render.)
 *
 * Each UPDATE is guarded with `icon = '<expected_old>'` so the
 * migration is a no-op when run a second time, and a no-op when an
 * operator has already set a different valid Lucide name (operator
 * wins as long as the name actually renders).
 */
export class FixInvalidMenuIcons1790500000000 implements MigrationInterface {
  name = 'FixInvalidMenuIcons1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 'Roles' is not a Lucide icon (closest valid name is 'Shield' /
    // 'ShieldCheck' / 'UserCog'). Rewrite to ShieldCheck so the
    // sidebar stops falling back to the generic Menu icon.
    await queryRunner.query(
      `UPDATE menu SET icon = 'ShieldCheck' WHERE code = 'roles' AND icon = 'Roles'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert only if our previous `up` wrote the new value.
    await queryRunner.query(
      `UPDATE menu SET icon = 'Roles' WHERE code = 'roles' AND icon = 'ShieldCheck'`,
    );
  }
}