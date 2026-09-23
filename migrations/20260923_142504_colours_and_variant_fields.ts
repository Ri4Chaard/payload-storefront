import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_variants_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum__variants_v_version_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TABLE "colours" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "colours_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "variants_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer
  );
  
  CREATE TABLE "variants_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_variants_v_version_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_variants_v_version_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "variants" ADD COLUMN "availability" "enum_variants_availability";
  ALTER TABLE "_variants_v" ADD COLUMN "version_availability" "enum__variants_v_version_availability";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "colours_id" integer;
  ALTER TABLE "colours_locales" ADD CONSTRAINT "colours_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_attributes" ADD CONSTRAINT "variants_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_attributes" ADD CONSTRAINT "variants_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_attributes_locales" ADD CONSTRAINT "variants_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."variants_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes" ADD CONSTRAINT "_variants_v_version_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes" ADD CONSTRAINT "_variants_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes_locales" ADD CONSTRAINT "_variants_v_version_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_variants_v_version_attributes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "colours_value_idx" ON "colours" USING btree ("value");
  CREATE INDEX "colours_updated_at_idx" ON "colours" USING btree ("updated_at");
  CREATE INDEX "colours_created_at_idx" ON "colours" USING btree ("created_at");
  CREATE UNIQUE INDEX "colours_locales_locale_parent_id_unique" ON "colours_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "variants_attributes_order_idx" ON "variants_attributes" USING btree ("_order");
  CREATE INDEX "variants_attributes_parent_id_idx" ON "variants_attributes" USING btree ("_parent_id");
  CREATE INDEX "variants_attributes_attribute_idx" ON "variants_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "variants_attributes_locales_locale_parent_id_unique" ON "variants_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_variants_v_version_attributes_order_idx" ON "_variants_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_variants_v_version_attributes_parent_id_idx" ON "_variants_v_version_attributes" USING btree ("_parent_id");
  CREATE INDEX "_variants_v_version_attributes_attribute_idx" ON "_variants_v_version_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "_variants_v_version_attributes_locales_locale_parent_id_uniq" ON "_variants_v_version_attributes_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_colours_id_idx" ON "payload_locked_documents_rels" USING btree ("colours_id");
  /*
    The four colours that were an enum, seeded as rows KEEPING THEIR EXISTING VALUES (spec 011,
    FR-020). Every bookmarked and indexed ?colour=black link rests on that string surviving the
    move, so these four are not example data — they are the migration's whole promise.

    Their labels are lifted from the colour.* message keys the same change deletes: from here on
    the name lives on the row, in one place rather than in three JSON files (011/research.md R3).
  */
  INSERT INTO "colours" ("value", "order") VALUES
    ('black', 0), ('clear', 1), ('green', 2), ('multicolor', 3);

  INSERT INTO "colours_locales" ("label", "_locale", "_parent_id")
  SELECT v.label, v.locale::"_locales", c.id
  FROM "colours" c
  JOIN (VALUES
    ('black','en','Black'), ('black','uk','Чорний'), ('black','ru','Чёрный'),
    ('clear','en','Clear'), ('clear','uk','Прозорий'), ('clear','ru','Прозрачный'),
    ('green','en','Green'), ('green','uk','Зелений'), ('green','ru','Зелёный'),
    ('multicolor','en','Multicolor'), ('multicolor','uk','Різнокольоровий'), ('multicolor','ru','Разноцветный')
  ) AS v(value, locale, label) ON v.value = c."value";

  /*
    Every stone inherits its piece's mode, so a form opened straight after this migration is right
    rather than blank. stampAvailability() covers stones created from here on; this covers the ones
    that already exist.
  */
  UPDATE "variants" v SET "availability" = p."availability"::text::"enum_variants_availability"
  FROM "products" p WHERE v."product_id" = p."id";

  UPDATE "_variants_v" vv SET "version_availability" = p."availability"::text::"enum__variants_v_version_availability"
  FROM "products" p WHERE vv."version_product_id" = p."id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "colours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "colours_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variants_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variants_attributes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_variants_v_version_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_variants_v_version_attributes_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "colours" CASCADE;
  DROP TABLE "colours_locales" CASCADE;
  DROP TABLE "variants_attributes" CASCADE;
  DROP TABLE "variants_attributes_locales" CASCADE;
  DROP TABLE "_variants_v_version_attributes" CASCADE;
  DROP TABLE "_variants_v_version_attributes_locales" CASCADE;
  /*
    IF EXISTS on both, because the generator emits them unconditionally and the DROP TABLE above
    has already taken them: dropping "colours" CASCADE removes every dependent object, this
    constraint included. Rehearsing the rollback is what found it (spec 011, T010) — left as
    generated, this down fails partway on the constraint and the schema never comes back.
  */
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_colours_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_colours_id_idx";
  ALTER TABLE "variants" DROP COLUMN "availability";
  ALTER TABLE "_variants_v" DROP COLUMN "version_availability";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "colours_id";
  DROP TYPE "public"."enum_variants_availability";
  DROP TYPE "public"."enum__variants_v_version_availability";`)
}
