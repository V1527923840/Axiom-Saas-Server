import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillsTables1747000003000 implements MigrationInterface {
  name = 'CreateBillsTables1747000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_flow table
    await queryRunner.query(`
      CREATE TABLE "payment_flow" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" int NOT NULL,
        "userName" varchar(100) NOT NULL,
        "userEmail" varchar(255) NOT NULL,
        "orderNo" varchar(100) NOT NULL,
        "type" varchar(20) NOT NULL,
        "paymentMethod" varchar(20) NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "points" int NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "completedAt" timestamptz,
        CONSTRAINT "UQ_payment_flow_order_no" UNIQUE ("orderNo"),
        CONSTRAINT "PK_payment_flow_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_flow_user_id" ON "payment_flow" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_flow_status" ON "payment_flow" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_flow_created_at" ON "payment_flow" ("createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_flow" ADD CONSTRAINT "FK_payment_flow_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
    `);

    // Create consumption table
    await queryRunner.query(`
      CREATE TABLE "consumption" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" int NOT NULL,
        "userName" varchar(100) NOT NULL,
        "userEmail" varchar(255) NOT NULL,
        "consumeType" varchar(20) NOT NULL,
        "points" int NOT NULL,
        "balance" int NOT NULL,
        "businessId" varchar(100),
        "businessType" varchar(50),
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consumption_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consumption_user_id" ON "consumption" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consumption_created_at" ON "consumption" ("createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "consumption" ADD CONSTRAINT "FK_consumption_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "consumption" DROP CONSTRAINT "FK_consumption_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_flow" DROP CONSTRAINT "FK_payment_flow_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_consumption_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_consumption_user_id"`);
    await queryRunner.query(`DROP TABLE "consumption"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_flow_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_flow_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_flow_user_id"`);
    await queryRunner.query(`DROP TABLE "payment_flow"`);
  }
}
