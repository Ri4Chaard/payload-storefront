/**
 * The story page and the FAQ collection (spec 006, T017).
 *
 * **The two `IF EXISTS` clauses in `down` are a hand edit, and they are load-bearing.** Payload
 * generated this rollback with `DROP TABLE \"questions\" CASCADE` ABOVE the explicit
 * `ALTER TABLE \"payload_locked_documents_rels\" DROP CONSTRAINT ..._questions_fk`. The cascade has
 * already removed that foreign key by the time the explicit drop runs, so `migrate:down` failed with
 * `constraint ... does not exist` and left the batch half-reverted.
 *
 * Constitution IV requires a rollback that is TESTED rather than merely generated, and this is what
 * testing it found. Regenerating this file would reintroduce the ordering, so re-apply both clauses
 * if that ever happens.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_questions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__questions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_story_page_blocks_media_plate_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_story_page_blocks_closer_look_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_story_page_blocks_banner_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_story_page_blocks_banner_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_story_page_blocks_process_steps_steps_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_story_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__story_page_v_blocks_media_plate_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__story_page_v_blocks_closer_look_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__story_page_v_blocks_banner_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__story_page_v_blocks_banner_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__story_page_v_blocks_process_steps_steps_media_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__story_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_questions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_questions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__questions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "story_page_blocks_page_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_media_plate" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_kind" "enum_story_page_blocks_media_plate_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_closer_look_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "story_page_blocks_closer_look_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"word" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "story_page_blocks_closer_look" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"body" varchar,
  	"media_kind" "enum_story_page_blocks_closer_look_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"media_kind" "enum_story_page_blocks_banner_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"text_side" "enum_story_page_blocks_banner_text_side" DEFAULT 'left',
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_process_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_kind" "enum_story_page_blocks_process_steps_steps_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"title" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "story_page_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"_status" "enum_story_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "story_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "_story_page_v_blocks_page_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_media_plate" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_kind" "enum__story_page_v_blocks_media_plate_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"word" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"body" varchar,
  	"media_kind" "enum__story_page_v_blocks_closer_look_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"media_kind" "enum__story_page_v_blocks_banner_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"text_side" "enum__story_page_v_blocks_banner_text_side" DEFAULT 'left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_kind" "enum__story_page_v_blocks_process_steps_steps_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"title" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version__status" "enum__story_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_story_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "questions_id" integer;
  ALTER TABLE "_questions_v" ADD CONSTRAINT "_questions_v_parent_id_questions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_page_header" ADD CONSTRAINT "story_page_blocks_page_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_chips" ADD CONSTRAINT "story_page_blocks_closer_look_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_figures" ADD CONSTRAINT "story_page_blocks_closer_look_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps" ADD CONSTRAINT "story_page_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_faq" ADD CONSTRAINT "story_page_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page" ADD CONSTRAINT "story_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_rels" ADD CONSTRAINT "story_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_rels" ADD CONSTRAINT "story_page_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD CONSTRAINT "_story_page_v_blocks_page_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips" ADD CONSTRAINT "_story_page_v_blocks_closer_look_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" ADD CONSTRAINT "_story_page_v_blocks_closer_look_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_faq" ADD CONSTRAINT "_story_page_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v" ADD CONSTRAINT "_story_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_rels" ADD CONSTRAINT "_story_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_rels" ADD CONSTRAINT "_story_page_v_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "questions_updated_at_idx" ON "questions" USING btree ("updated_at");
  CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at");
  CREATE INDEX "questions__status_idx" ON "questions" USING btree ("_status");
  CREATE INDEX "_questions_v_parent_idx" ON "_questions_v" USING btree ("parent_id");
  CREATE INDEX "_questions_v_version_version_updated_at_idx" ON "_questions_v" USING btree ("version_updated_at");
  CREATE INDEX "_questions_v_version_version_created_at_idx" ON "_questions_v" USING btree ("version_created_at");
  CREATE INDEX "_questions_v_version_version__status_idx" ON "_questions_v" USING btree ("version__status");
  CREATE INDEX "_questions_v_created_at_idx" ON "_questions_v" USING btree ("created_at");
  CREATE INDEX "_questions_v_updated_at_idx" ON "_questions_v" USING btree ("updated_at");
  CREATE INDEX "_questions_v_latest_idx" ON "_questions_v" USING btree ("latest");
  CREATE INDEX "story_page_blocks_page_header_order_idx" ON "story_page_blocks_page_header" USING btree ("_order");
  CREATE INDEX "story_page_blocks_page_header_parent_id_idx" ON "story_page_blocks_page_header" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_page_header_path_idx" ON "story_page_blocks_page_header" USING btree ("_path");
  CREATE INDEX "story_page_blocks_media_plate_order_idx" ON "story_page_blocks_media_plate" USING btree ("_order");
  CREATE INDEX "story_page_blocks_media_plate_parent_id_idx" ON "story_page_blocks_media_plate" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_media_plate_path_idx" ON "story_page_blocks_media_plate" USING btree ("_path");
  CREATE INDEX "story_page_blocks_media_plate_media_media_photo_idx" ON "story_page_blocks_media_plate" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_media_plate_media_media_video_idx" ON "story_page_blocks_media_plate" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_media_plate_media_media_poster_idx" ON "story_page_blocks_media_plate" USING btree ("media_poster_id");
  CREATE INDEX "story_page_blocks_closer_look_chips_order_idx" ON "story_page_blocks_closer_look_chips" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_chips_parent_id_idx" ON "story_page_blocks_closer_look_chips" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_figures_order_idx" ON "story_page_blocks_closer_look_figures" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_figures_parent_id_idx" ON "story_page_blocks_closer_look_figures" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_order_idx" ON "story_page_blocks_closer_look" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_parent_id_idx" ON "story_page_blocks_closer_look" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_path_idx" ON "story_page_blocks_closer_look" USING btree ("_path");
  CREATE INDEX "story_page_blocks_closer_look_media_media_photo_idx" ON "story_page_blocks_closer_look" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_closer_look_media_media_video_idx" ON "story_page_blocks_closer_look" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_closer_look_media_media_poster_idx" ON "story_page_blocks_closer_look" USING btree ("media_poster_id");
  CREATE INDEX "story_page_blocks_banner_order_idx" ON "story_page_blocks_banner" USING btree ("_order");
  CREATE INDEX "story_page_blocks_banner_parent_id_idx" ON "story_page_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_banner_path_idx" ON "story_page_blocks_banner" USING btree ("_path");
  CREATE INDEX "story_page_blocks_banner_media_media_photo_idx" ON "story_page_blocks_banner" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_banner_media_media_video_idx" ON "story_page_blocks_banner" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_banner_media_media_poster_idx" ON "story_page_blocks_banner" USING btree ("media_poster_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_order_idx" ON "story_page_blocks_process_steps_steps" USING btree ("_order");
  CREATE INDEX "story_page_blocks_process_steps_steps_parent_id_idx" ON "story_page_blocks_process_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_photo_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_video_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_poster_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_poster_id");
  CREATE INDEX "story_page_blocks_process_steps_order_idx" ON "story_page_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "story_page_blocks_process_steps_parent_id_idx" ON "story_page_blocks_process_steps" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_path_idx" ON "story_page_blocks_process_steps" USING btree ("_path");
  CREATE INDEX "story_page_blocks_faq_order_idx" ON "story_page_blocks_faq" USING btree ("_order");
  CREATE INDEX "story_page_blocks_faq_parent_id_idx" ON "story_page_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_faq_path_idx" ON "story_page_blocks_faq" USING btree ("_path");
  CREATE INDEX "story_page_seo_seo_image_idx" ON "story_page" USING btree ("seo_image_id");
  CREATE INDEX "story_page__status_idx" ON "story_page" USING btree ("_status");
  CREATE INDEX "story_page_rels_order_idx" ON "story_page_rels" USING btree ("order");
  CREATE INDEX "story_page_rels_parent_idx" ON "story_page_rels" USING btree ("parent_id");
  CREATE INDEX "story_page_rels_path_idx" ON "story_page_rels" USING btree ("path");
  CREATE INDEX "story_page_rels_questions_id_idx" ON "story_page_rels" USING btree ("questions_id");
  CREATE INDEX "_story_page_v_blocks_page_header_order_idx" ON "_story_page_v_blocks_page_header" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_page_header_parent_id_idx" ON "_story_page_v_blocks_page_header" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_page_header_path_idx" ON "_story_page_v_blocks_page_header" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_media_plate_order_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_media_plate_parent_id_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_path_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_photo_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_video_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_poster_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_poster_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_chips_order_idx" ON "_story_page_v_blocks_closer_look_chips" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_chips_parent_id_idx" ON "_story_page_v_blocks_closer_look_chips" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_figures_order_idx" ON "_story_page_v_blocks_closer_look_figures" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_figures_parent_id_idx" ON "_story_page_v_blocks_closer_look_figures" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_order_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_parent_id_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_path_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_photo_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_video_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_poster_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_poster_id");
  CREATE INDEX "_story_page_v_blocks_banner_order_idx" ON "_story_page_v_blocks_banner" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_banner_parent_id_idx" ON "_story_page_v_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_banner_path_idx" ON "_story_page_v_blocks_banner" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_photo_idx" ON "_story_page_v_blocks_banner" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_video_idx" ON "_story_page_v_blocks_banner" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_poster_idx" ON "_story_page_v_blocks_banner" USING btree ("media_poster_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_order_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_parent_id_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_pho_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_vid_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_pos_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_poster_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_order_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_process_steps_parent_id_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_path_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_faq_order_idx" ON "_story_page_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_faq_parent_id_idx" ON "_story_page_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_faq_path_idx" ON "_story_page_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_story_page_v_version_seo_version_seo_image_idx" ON "_story_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_story_page_v_version_version__status_idx" ON "_story_page_v" USING btree ("version__status");
  CREATE INDEX "_story_page_v_created_at_idx" ON "_story_page_v" USING btree ("created_at");
  CREATE INDEX "_story_page_v_updated_at_idx" ON "_story_page_v" USING btree ("updated_at");
  CREATE INDEX "_story_page_v_latest_idx" ON "_story_page_v" USING btree ("latest");
  CREATE INDEX "_story_page_v_rels_order_idx" ON "_story_page_v_rels" USING btree ("order");
  CREATE INDEX "_story_page_v_rels_parent_idx" ON "_story_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_story_page_v_rels_path_idx" ON "_story_page_v_rels" USING btree ("path");
  CREATE INDEX "_story_page_v_rels_questions_id_idx" ON "_story_page_v_rels" USING btree ("questions_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("questions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_questions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_page_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_media_plate" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_process_steps_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_process_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_page_header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_media_plate" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_process_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "questions" CASCADE;
  DROP TABLE "_questions_v" CASCADE;
  DROP TABLE "story_page_blocks_page_header" CASCADE;
  DROP TABLE "story_page_blocks_media_plate" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_chips" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_figures" CASCADE;
  DROP TABLE "story_page_blocks_closer_look" CASCADE;
  DROP TABLE "story_page_blocks_banner" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_steps" CASCADE;
  DROP TABLE "story_page_blocks_process_steps" CASCADE;
  DROP TABLE "story_page_blocks_faq" CASCADE;
  DROP TABLE "story_page" CASCADE;
  DROP TABLE "story_page_rels" CASCADE;
  DROP TABLE "_story_page_v_blocks_page_header" CASCADE;
  DROP TABLE "_story_page_v_blocks_media_plate" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_chips" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_figures" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look" CASCADE;
  DROP TABLE "_story_page_v_blocks_banner" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_steps" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps" CASCADE;
  DROP TABLE "_story_page_v_blocks_faq" CASCADE;
  DROP TABLE "_story_page_v" CASCADE;
  DROP TABLE "_story_page_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_questions_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_questions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "questions_id";
  DROP TYPE "public"."enum_questions_status";
  DROP TYPE "public"."enum__questions_v_version_status";
  DROP TYPE "public"."enum_story_page_blocks_media_plate_media_kind";
  DROP TYPE "public"."enum_story_page_blocks_closer_look_media_kind";
  DROP TYPE "public"."enum_story_page_blocks_banner_media_kind";
  DROP TYPE "public"."enum_story_page_blocks_banner_text_side";
  DROP TYPE "public"."enum_story_page_blocks_process_steps_steps_media_kind";
  DROP TYPE "public"."enum_story_page_status";
  DROP TYPE "public"."enum__story_page_v_blocks_media_plate_media_kind";
  DROP TYPE "public"."enum__story_page_v_blocks_closer_look_media_kind";
  DROP TYPE "public"."enum__story_page_v_blocks_banner_media_kind";
  DROP TYPE "public"."enum__story_page_v_blocks_banner_text_side";
  DROP TYPE "public"."enum__story_page_v_blocks_process_steps_steps_media_kind";
  DROP TYPE "public"."enum__story_page_v_version_status";`)
}
