import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_colour" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_colour" DISABLE ROW LEVEL SECURITY;

  /*
    The columns come FIRST, and the data moves BEFORE anything is dropped.

    Left as generated, this migration dropped products_colour on its first line and added the
    relationship column on its third — every colour on every published piece, gone, with no error
    and nothing to roll back to. The generator cannot know the two represent the same field; that is
    the author's job (spec 011, T031).
  */
  ALTER TABLE "products_rels" ADD COLUMN "colours_id" integer;
  ALTER TABLE "_products_v_rels" ADD COLUMN "colours_id" integer;

  /*
    Every enum row becomes a relationship row pointing at the colour of the same value.

    "path" is the field name the relationship belongs to, and "order" is preserved from the enum
    row so a piece keeps the order its colours were entered in.
  */
  INSERT INTO "products_rels" ("order", "parent_id", "path", "colours_id")
  SELECT pc."order", pc."parent_id", 'colour', c."id"
  FROM "products_colour" pc
  JOIN "colours" c ON c."value" = pc."value"::text;

  INSERT INTO "_products_v_rels" ("order", "parent_id", "path", "colours_id")
  SELECT vc."order", vc."parent_id", 'version.colour', c."id"
  FROM "_products_v_version_colour" vc
  JOIN "colours" c ON c."value" = vc."value"::text;

  DROP TABLE "products_colour" CASCADE;
  DROP TABLE "_products_v_version_colour" CASCADE;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_colours_id_idx" ON "products_rels" USING btree ("colours_id");
  CREATE INDEX "_products_v_rels_colours_id_idx" ON "_products_v_rels" USING btree ("colours_id");
  DROP TYPE "public"."enum_products_colour";
  DROP TYPE "public"."enum__products_v_version_colour";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  /*
    **This rollback NARROWS, so it refuses rather than discards** (spec 011, FR-020; the shape spec
    004's country enum established).

    Going back means an enum of exactly four values. A colour the owner has added since — the whole
    point of the feature — cannot be represented in it, and the only ways through are to drop those
    pieces' colours silently or to stop. A rollback that quietly edits published content is not a
    rollback.
  */
  DO $$
  DECLARE
    stranded bigint;
  BEGIN
    SELECT count(*) INTO stranded
    FROM "products_rels" pr
    JOIN "colours" c ON c."id" = pr."colours_id"
    WHERE pr."path" = 'colour'
      AND c."value" NOT IN ('black','clear','green','multicolor');

    IF stranded > 0 THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Cannot roll back: %s product colour(s) use a colour outside the pre-011 list of 4.', stranded),
        HINT = 'Re-colour or clear those products first: SELECT pr.parent_id, c.value FROM products_rels pr JOIN colours c ON c.id = pr.colours_id WHERE pr.path = ''colour'' AND c.value NOT IN (''black'',''clear'',''green'',''multicolor''). They are NOT changed automatically — that would edit published content to make a schema change succeed.';
    END IF;
  END $$;

  CREATE TYPE "public"."enum_products_colour" AS ENUM('black', 'clear', 'green', 'multicolor');
  CREATE TYPE "public"."enum__products_v_version_colour" AS ENUM('black', 'clear', 'green', 'multicolor');
  CREATE TABLE "products_colour" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_colour",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_version_colour" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_colour",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_colours_fk";
  
  ALTER TABLE "_products_v_rels" DROP CONSTRAINT "_products_v_rels_colours_fk";
  
  DROP INDEX "products_rels_colours_id_idx";
  DROP INDEX "_products_v_rels_colours_id_idx";
  ALTER TABLE "products_colour" ADD CONSTRAINT "products_colour_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_colour" ADD CONSTRAINT "_products_v_version_colour_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_colour_order_idx" ON "products_colour" USING btree ("order");
  CREATE INDEX "products_colour_parent_idx" ON "products_colour" USING btree ("parent_id");
  CREATE INDEX "products_colour_value_idx" ON "products_colour" USING btree ("value");
  CREATE INDEX "_products_v_version_colour_order_idx" ON "_products_v_version_colour" USING btree ("order");
  CREATE INDEX "_products_v_version_colour_parent_idx" ON "_products_v_version_colour" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_colour_value_idx" ON "_products_v_version_colour" USING btree ("value");
  /*
    And the data goes back the way it came, before the column carrying it is dropped — the mirror of
    the note in up(). The guard above has already established that every colour in use can be
    represented by the four-value enum, so this cannot fail on a cast.
  */
  INSERT INTO "products_colour" ("order", "parent_id", "value")
  SELECT pr."order", pr."parent_id", c."value"::"enum_products_colour"
  FROM "products_rels" pr
  JOIN "colours" c ON c."id" = pr."colours_id"
  WHERE pr."path" = 'colour';

  INSERT INTO "_products_v_version_colour" ("order", "parent_id", "value")
  SELECT vr."order", vr."parent_id", c."value"::"enum__products_v_version_colour"
  FROM "_products_v_rels" vr
  JOIN "colours" c ON c."id" = vr."colours_id"
  WHERE vr."path" = 'version.colour';

  DELETE FROM "products_rels" WHERE "path" = 'colour';
  DELETE FROM "_products_v_rels" WHERE "path" = 'version.colour';

  ALTER TABLE "products_rels" DROP COLUMN "colours_id";
  ALTER TABLE "_products_v_rels" DROP COLUMN "colours_id";`)
}
