import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "story_page_blocks_closer_look_figures_locales" ADD COLUMN "word" varchar;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures_locales" ADD COLUMN "word" varchar;`)

  /*
    **The generated migration does not carry data, and this is the part that does** — the same gap
    `20260911_135539_localization` records. Run as generated, every figure's word would be dropped
    with its column.

    The shared value moves in as English, which every other locale falls back to until translated.
    Unlike that migration, the `_locales` rows may already exist (each figure's caption has one), so
    this is an upsert on the (`_locale`, `_parent_id`) unique index rather than a plain insert.
  */
  await db.execute(sql`
  INSERT INTO "story_page_blocks_closer_look_figures_locales" ("_locale", "_parent_id", "word")
  SELECT 'en', "id", "word" FROM "story_page_blocks_closer_look_figures"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "word" = EXCLUDED."word";
  INSERT INTO "_story_page_v_blocks_closer_look_figures_locales" ("_locale", "_parent_id", "word")
  SELECT 'en', "id", "word" FROM "_story_page_v_blocks_closer_look_figures"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "word" = EXCLUDED."word";`)

  await db.execute(sql`
   ALTER TABLE "story_page_blocks_closer_look_figures" DROP COLUMN "word";
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" DROP COLUMN "word";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "story_page_blocks_closer_look_figures" ADD COLUMN "word" varchar;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" ADD COLUMN "word" varchar;`)

  // Back to one shared value: the English one, which is what every locale fell back to.
  await db.execute(sql`
  UPDATE "story_page_blocks_closer_look_figures" f SET "word" = l."word"
  FROM "story_page_blocks_closer_look_figures_locales" l
  WHERE l."_parent_id" = f."id" AND l."_locale" = 'en';
  UPDATE "_story_page_v_blocks_closer_look_figures" f SET "word" = l."word"
  FROM "_story_page_v_blocks_closer_look_figures_locales" l
  WHERE l."_parent_id" = f."id" AND l."_locale" = 'en';`)

  await db.execute(sql`
   ALTER TABLE "story_page_blocks_closer_look_figures_locales" DROP COLUMN "word";
  ALTER TABLE "_story_page_v_blocks_closer_look_figures_locales" DROP COLUMN "word";`)
}
