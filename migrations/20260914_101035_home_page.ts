import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TABLE "home_page_about_body" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "home_page_about_body_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_photo_id" integer,
  	"about_photo_id" integer,
  	"seo_image_id" integer,
  	"_status" "enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_locales" (
  	"hero_headline" varchar DEFAULT 'The beauty of lab-grown diamonds',
  	"hero_lede" varchar DEFAULT 'Each diamond is created with care for the future, without compromising on quality or brilliance. Modern luxury that combines flawless craftsmanship, sustainability, and affordability',
  	"hero_cta_label" varchar DEFAULT 'Shop now',
  	"categories_heading" varchar DEFAULT 'Shop by category',
  	"featured_heading" varchar DEFAULT 'All jewelry',
  	"featured_cta_label" varchar DEFAULT 'View all',
  	"about_heading_lead" varchar DEFAULT 'About',
  	"about_heading_emphasis" varchar DEFAULT 'Aurum',
  	"about_cta_label" varchar DEFAULT 'Discover our story',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_page_v_version_about_body" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_version_about_body_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_photo_id" integer,
  	"version_about_photo_id" integer,
  	"version_seo_image_id" integer,
  	"version__status" "enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_page_v_locales" (
  	"version_hero_headline" varchar DEFAULT 'The beauty of lab-grown diamonds',
  	"version_hero_lede" varchar DEFAULT 'Each diamond is created with care for the future, without compromising on quality or brilliance. Modern luxury that combines flawless craftsmanship, sustainability, and affordability',
  	"version_hero_cta_label" varchar DEFAULT 'Shop now',
  	"version_categories_heading" varchar DEFAULT 'Shop by category',
  	"version_featured_heading" varchar DEFAULT 'All jewelry',
  	"version_featured_cta_label" varchar DEFAULT 'View all',
  	"version_about_heading_lead" varchar DEFAULT 'About',
  	"version_about_heading_emphasis" varchar DEFAULT 'Aurum',
  	"version_about_cta_label" varchar DEFAULT 'Discover our story',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "home_page_about_body" ADD CONSTRAINT "home_page_about_body_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_about_body_locales" ADD CONSTRAINT "home_page_about_body_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_about_body"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_photo_id_media_id_fk" FOREIGN KEY ("hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_about_photo_id_media_id_fk" FOREIGN KEY ("about_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_locales" ADD CONSTRAINT "home_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_about_body" ADD CONSTRAINT "_home_page_v_version_about_body_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_about_body_locales" ADD CONSTRAINT "_home_page_v_version_about_body_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_version_about_body"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_hero_photo_id_media_id_fk" FOREIGN KEY ("version_hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_about_photo_id_media_id_fk" FOREIGN KEY ("version_about_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_locales" ADD CONSTRAINT "_home_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_about_body_order_idx" ON "home_page_about_body" USING btree ("_order");
  CREATE INDEX "home_page_about_body_parent_id_idx" ON "home_page_about_body" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_page_about_body_locales_locale_parent_id_unique" ON "home_page_about_body_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_hero_hero_photo_idx" ON "home_page" USING btree ("hero_photo_id");
  CREATE INDEX "home_page_about_about_photo_idx" ON "home_page" USING btree ("about_photo_id");
  CREATE INDEX "home_page_seo_seo_image_idx" ON "home_page" USING btree ("seo_image_id");
  CREATE INDEX "home_page__status_idx" ON "home_page" USING btree ("_status");
  CREATE UNIQUE INDEX "home_page_locales_locale_parent_id_unique" ON "home_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_about_body_order_idx" ON "_home_page_v_version_about_body" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_about_body_parent_id_idx" ON "_home_page_v_version_about_body" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_page_v_version_about_body_locales_locale_parent_id_uni" ON "_home_page_v_version_about_body_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_hero_version_hero_photo_idx" ON "_home_page_v" USING btree ("version_hero_photo_id");
  CREATE INDEX "_home_page_v_version_about_version_about_photo_idx" ON "_home_page_v" USING btree ("version_about_photo_id");
  CREATE INDEX "_home_page_v_version_seo_version_seo_image_idx" ON "_home_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_snapshot_idx" ON "_home_page_v" USING btree ("snapshot");
  CREATE INDEX "_home_page_v_published_locale_idx" ON "_home_page_v" USING btree ("published_locale");
  CREATE INDEX "_home_page_v_latest_idx" ON "_home_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_home_page_v_locales_locale_parent_id_unique" ON "_home_page_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_page_about_body" CASCADE;
  DROP TABLE "home_page_about_body_locales" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "_home_page_v_version_about_body" CASCADE;
  DROP TABLE "_home_page_v_version_about_body_locales" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_locales" CASCADE;
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum__home_page_v_published_locale";`)
}
