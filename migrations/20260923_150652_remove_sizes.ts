import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sizes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sizes_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "sizes" CASCADE;
  DROP TABLE "sizes_locales" CASCADE;
  ALTER TABLE "products_rels" DROP CONSTRAINT IF EXISTS "products_rels_sizes_fk";
  
  ALTER TABLE "_products_v_rels" DROP CONSTRAINT IF EXISTS "_products_v_rels_sizes_fk";
  
  ALTER TABLE "carts_items" DROP CONSTRAINT IF EXISTS "carts_items_size_id_sizes_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sizes_fk";
  
  DROP INDEX IF EXISTS "products_rels_sizes_id_idx";
  DROP INDEX IF EXISTS "_products_v_rels_sizes_id_idx";
  DROP INDEX IF EXISTS "carts_items_size_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_sizes_id_idx";
  ALTER TABLE "products_rels" DROP COLUMN "sizes_id";
  ALTER TABLE "_products_v_rels" DROP COLUMN "sizes_id";
  ALTER TABLE "carts_items" DROP COLUMN "size_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sizes_id";`)
}

/**
 * **This rollback restores the SHAPE, not the data** (spec 011, T045).
 *
 * Sizes are deprecated and their rows are dropped by `up`. Rolling back recreates the tables and
 * the columns empty, so the schema matches a pre-011 checkout and nothing errors — but a piece will
 * not remember which sizes it was made in, and a cart line will not remember which one a customer
 * chose. There is nowhere to recover that from.
 *
 * Recorded rather than hidden, because it is the one thing an operator needs to know before running
 * it. It is also why nothing else in this feature is destructive: colour's rollback refuses rather
 * than discarding precisely because it CAN be reversed, and this one cannot.
 *
 * `IF EXISTS` throughout for the reason M1 found the hard way: `DROP TABLE … CASCADE` above has
 * already taken the constraints and indexes the generator then drops by name.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "sizes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"category_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sizes_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products_rels" ADD COLUMN "sizes_id" integer;
  ALTER TABLE "_products_v_rels" ADD COLUMN "sizes_id" integer;
  ALTER TABLE "carts_items" ADD COLUMN "size_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sizes_id" integer;
  ALTER TABLE "sizes" ADD CONSTRAINT "sizes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sizes_locales" ADD CONSTRAINT "sizes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sizes_value_idx" ON "sizes" USING btree ("value");
  CREATE INDEX "sizes_category_idx" ON "sizes" USING btree ("category_id");
  CREATE INDEX "sizes_updated_at_idx" ON "sizes" USING btree ("updated_at");
  CREATE INDEX "sizes_created_at_idx" ON "sizes" USING btree ("created_at");
  CREATE UNIQUE INDEX "sizes_locales_locale_parent_id_unique" ON "sizes_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_sizes_id_idx" ON "products_rels" USING btree ("sizes_id");
  CREATE INDEX "_products_v_rels_sizes_id_idx" ON "_products_v_rels" USING btree ("sizes_id");
  CREATE INDEX "carts_items_size_idx" ON "carts_items" USING btree ("size_id");
  CREATE INDEX "payload_locked_documents_rels_sizes_id_idx" ON "payload_locked_documents_rels" USING btree ("sizes_id");`)
}
