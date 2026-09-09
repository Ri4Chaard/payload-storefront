import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_settings" ADD COLUMN "email" varchar DEFAULT 'hello@aurum.example';
  ALTER TABLE "contact_settings" ADD COLUMN "phone" varchar DEFAULT '+1 (555) 010 20-30';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_settings" DROP COLUMN "email";
  ALTER TABLE "contact_settings" DROP COLUMN "phone";`)
}
