import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "account" ALTER COLUMN "sign_in_create_prompt" SET DEFAULT 'Don’t have an account?';
  ALTER TABLE "account" ALTER COLUMN "create_sign_in_prompt" SET DEFAULT 'Already have an account?';
  ALTER TABLE "account" ADD COLUMN "sign_in_create_link" varchar DEFAULT 'Create one';
  ALTER TABLE "account" ADD COLUMN "create_sign_in_link" varchar DEFAULT 'Log in';
  ALTER TABLE "account" ADD COLUMN "create_email_invalid" varchar DEFAULT 'That does not look like an email address.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "account" ALTER COLUMN "sign_in_create_prompt" SET DEFAULT 'Don’t have an account? Create one';
  ALTER TABLE "account" ALTER COLUMN "create_sign_in_prompt" SET DEFAULT 'Already have an account? Log in';
  ALTER TABLE "account" DROP COLUMN "sign_in_create_link";
  ALTER TABLE "account" DROP COLUMN "create_sign_in_link";
  ALTER TABLE "account" DROP COLUMN "create_email_invalid";`)
}
