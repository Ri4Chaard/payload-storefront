import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cookie_settings" ADD COLUMN "banner_body" varchar DEFAULT 'We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.';
  ALTER TABLE "_cookie_settings_v" ADD COLUMN "version_banner_body" varchar DEFAULT 'We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cookie_settings" DROP COLUMN "banner_body";
  ALTER TABLE "_cookie_settings_v" DROP COLUMN "version_banner_body";`)
}
