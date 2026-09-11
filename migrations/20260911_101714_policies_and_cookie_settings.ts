import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_policies_footer_placement" AS ENUM('legal', 'customer-care', 'hidden');
  CREATE TYPE "public"."enum_policies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__policies_v_version_footer_placement" AS ENUM('legal', 'customer-care', 'hidden');
  CREATE TYPE "public"."enum__policies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cookie_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cookie_settings_v_version_status" AS ENUM('draft', 'published');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'purgeEnquiries';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'purgeEnquiries';
  CREATE TABLE "policies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"effective_date" timestamp(3) with time zone,
  	"footer_placement" "enum_policies_footer_placement" DEFAULT 'legal',
  	"footer_order" numeric DEFAULT 0,
  	"title" varchar,
  	"subtitle" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_policies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_policies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_effective_date" timestamp(3) with time zone,
  	"version_footer_placement" "enum__policies_v_version_footer_placement" DEFAULT 'legal',
  	"version_footer_order" numeric DEFAULT 0,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__policies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "cookie_settings_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"purpose" varchar,
  	"necessary" boolean DEFAULT false
  );
  
  CREATE TABLE "cookie_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"consent_version" numeric DEFAULT 1,
  	"policy_id" integer,
  	"_status" "enum_cookie_settings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_cookie_settings_v_version_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"name" varchar,
  	"purpose" varchar,
  	"necessary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cookie_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_enabled" boolean DEFAULT true,
  	"version_consent_version" numeric DEFAULT 1,
  	"version_policy_id" integer,
  	"version__status" "enum__cookie_settings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "policies_id" integer;
  ALTER TABLE "policies" ADD CONSTRAINT "policies_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_policies_v" ADD CONSTRAINT "_policies_v_parent_id_policies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_policies_v" ADD CONSTRAINT "_policies_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cookie_settings_categories" ADD CONSTRAINT "cookie_settings_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings" ADD CONSTRAINT "cookie_settings_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_version_categories" ADD CONSTRAINT "_cookie_settings_v_version_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v" ADD CONSTRAINT "_cookie_settings_v_version_policy_id_policies_id_fk" FOREIGN KEY ("version_policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "policies_slug_idx" ON "policies" USING btree ("slug");
  CREATE INDEX "policies_seo_seo_image_idx" ON "policies" USING btree ("seo_image_id");
  CREATE INDEX "policies_updated_at_idx" ON "policies" USING btree ("updated_at");
  CREATE INDEX "policies_created_at_idx" ON "policies" USING btree ("created_at");
  CREATE INDEX "policies__status_idx" ON "policies" USING btree ("_status");
  CREATE INDEX "_policies_v_parent_idx" ON "_policies_v" USING btree ("parent_id");
  CREATE INDEX "_policies_v_version_version_slug_idx" ON "_policies_v" USING btree ("version_slug");
  CREATE INDEX "_policies_v_version_seo_version_seo_image_idx" ON "_policies_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_policies_v_version_version_updated_at_idx" ON "_policies_v" USING btree ("version_updated_at");
  CREATE INDEX "_policies_v_version_version_created_at_idx" ON "_policies_v" USING btree ("version_created_at");
  CREATE INDEX "_policies_v_version_version__status_idx" ON "_policies_v" USING btree ("version__status");
  CREATE INDEX "_policies_v_created_at_idx" ON "_policies_v" USING btree ("created_at");
  CREATE INDEX "_policies_v_updated_at_idx" ON "_policies_v" USING btree ("updated_at");
  CREATE INDEX "_policies_v_latest_idx" ON "_policies_v" USING btree ("latest");
  CREATE INDEX "cookie_settings_categories_order_idx" ON "cookie_settings_categories" USING btree ("_order");
  CREATE INDEX "cookie_settings_categories_parent_id_idx" ON "cookie_settings_categories" USING btree ("_parent_id");
  CREATE INDEX "cookie_settings_policy_idx" ON "cookie_settings" USING btree ("policy_id");
  CREATE INDEX "cookie_settings__status_idx" ON "cookie_settings" USING btree ("_status");
  CREATE INDEX "_cookie_settings_v_version_categories_order_idx" ON "_cookie_settings_v_version_categories" USING btree ("_order");
  CREATE INDEX "_cookie_settings_v_version_categories_parent_id_idx" ON "_cookie_settings_v_version_categories" USING btree ("_parent_id");
  CREATE INDEX "_cookie_settings_v_version_version_policy_idx" ON "_cookie_settings_v" USING btree ("version_policy_id");
  CREATE INDEX "_cookie_settings_v_version_version__status_idx" ON "_cookie_settings_v" USING btree ("version__status");
  CREATE INDEX "_cookie_settings_v_created_at_idx" ON "_cookie_settings_v" USING btree ("created_at");
  CREATE INDEX "_cookie_settings_v_updated_at_idx" ON "_cookie_settings_v" USING btree ("updated_at");
  CREATE INDEX "_cookie_settings_v_latest_idx" ON "_cookie_settings_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_policies_fk" FOREIGN KEY ("policies_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_policies_id_idx" ON "payload_locked_documents_rels" USING btree ("policies_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "policies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_policies_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cookie_settings_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cookie_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cookie_settings_v_version_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cookie_settings_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "policies" CASCADE;
  DROP TABLE "_policies_v" CASCADE;
  DROP TABLE "cookie_settings_categories" CASCADE;
  DROP TABLE "cookie_settings" CASCADE;
  DROP TABLE "_cookie_settings_v_version_categories" CASCADE;
  DROP TABLE "_cookie_settings_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_policies_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'purgeAccounts', 'expireCarts');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'purgeAccounts', 'expireCarts');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_policies_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "policies_id";
  DROP TYPE "public"."enum_policies_footer_placement";
  DROP TYPE "public"."enum_policies_status";
  DROP TYPE "public"."enum__policies_v_version_footer_placement";
  DROP TYPE "public"."enum__policies_v_version_status";
  DROP TYPE "public"."enum_cookie_settings_status";
  DROP TYPE "public"."enum__cookie_settings_v_version_status";`)
}
