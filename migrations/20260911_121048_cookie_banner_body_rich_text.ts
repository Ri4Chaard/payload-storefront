import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * HAND-EDITED. `payload migrate:create` produced an `up` that cannot run.
 *
 * It emits a bare `ALTER COLUMN "banner_body" SET DATA TYPE jsonb`, and Postgres refuses:
 *
 *     column "banner_body" cannot be cast automatically to type jsonb
 *
 * There is no implicit cast from `varchar` to `jsonb`, and adding `USING banner_body::jsonb` would
 * not help — the column holds an English sentence, which is not JSON. The previous migration
 * created it as a `varchar` and backfilled every row with that sentence as its default.
 *
 * **The values are dropped rather than converted, and that is safe here specifically.** This column
 * was added earlier the same day, in the migration immediately before this one, and has never
 * existed in any deployed environment — so the only value it can hold is the default the `ADD
 * COLUMN` wrote. `SET DEFAULT` below re-establishes the same sentence as a lexical document, and
 * `toCookieSettings` falls back to it for a NULL, so nothing an owner wrote is at risk and nothing
 * renders empty.
 *
 * **This would be the wrong fix on a column with real content.** That would need a data migration
 * wrapping each row's text in a lexical paragraph before the type change. If you are reading this
 * while changing a populated `varchar` to `jsonb`, do that instead of copying this.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" DROP DEFAULT;
  ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" SET DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb;
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" DROP DEFAULT;
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" SET DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" DROP DEFAULT;
  ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "cookie_settings" ALTER COLUMN "banner_body" SET DEFAULT 'We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.';
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" DROP DEFAULT;
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "_cookie_settings_v" ALTER COLUMN "version_banner_body" SET DEFAULT 'We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.';`)
}
