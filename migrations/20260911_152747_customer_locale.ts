import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_customers_locale" AS ENUM('en', 'ru', 'uk');
  ALTER TABLE "customers" ADD COLUMN "locale" "enum_customers_locale" DEFAULT 'en';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP COLUMN "locale";
  DROP TYPE "public"."enum_customers_locale";`)
}
