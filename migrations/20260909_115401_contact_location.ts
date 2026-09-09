import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_settings" ADD COLUMN "address" varchar DEFAULT '12 Market Street, Old Town, Example City';
  ALTER TABLE "contact_settings" ADD COLUMN "opening_hours" varchar DEFAULT 'Daily · 10:00 AM–9:00 PM';
  ALTER TABLE "contact_settings" ADD COLUMN "maps_url" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_settings" DROP COLUMN "address";
  ALTER TABLE "contact_settings" DROP COLUMN "opening_hours";
  ALTER TABLE "contact_settings" DROP COLUMN "maps_url";`)
}
