import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntelligenceMenu1780194635192 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert intelligence menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '情报精选',
        'intelligence',
        'Star',
        '/content/intelligence',
        NULL,
        5,
        'active',
        NOW(),
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM menu WHERE code = 'intelligence'
    `);
  }
}
