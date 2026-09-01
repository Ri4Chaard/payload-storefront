import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shop" ADD COLUMN "details_title" varchar DEFAULT 'PRODUCT DETAILS';
  ALTER TABLE "shop" ADD COLUMN "warranty_title" varchar DEFAULT '3 YEAR WARRANTY + FREE RETURNS';
  ALTER TABLE "shop" ADD COLUMN "delivery_title" varchar DEFAULT 'DELIVERY';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shop" DROP COLUMN "details_title";
  ALTER TABLE "shop" DROP COLUMN "warranty_title";
  ALTER TABLE "shop" DROP COLUMN "delivery_title";`)
}
