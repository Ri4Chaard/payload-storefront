import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_enquiries_notification" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_contact_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_faq_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"notification" "enum_enquiries_notification" DEFAULT 'pending' NOT NULL,
  	"notification_error" varchar,
  	"sender_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar DEFAULT 'CONTACT US',
  	"heading" varchar DEFAULT 'WE’RE HERE TO HELP',
  	"intro" varchar DEFAULT 'Questions, custom requests, or styling advice — our team is here for you',
  	"form_heading" varchar DEFAULT 'SEND US A MESSAGE',
  	"form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.',
  	"form_name_label" varchar DEFAULT 'Name',
  	"form_email_label" varchar DEFAULT 'E-mail',
  	"form_message_label" varchar DEFAULT 'Message',
  	"form_submit_label" varchar DEFAULT 'SEND MESSAGE',
  	"form_footnote" varchar DEFAULT 'We’ll get back to you as soon as possible.',
  	"form_success_message" varchar DEFAULT 'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
  	"form_error_message" varchar DEFAULT 'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
  	"form_photo_id" integer,
  	"faq_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"_status" "enum_contact_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "_contact_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_eyebrow" varchar DEFAULT 'CONTACT US',
  	"version_heading" varchar DEFAULT 'WE’RE HERE TO HELP',
  	"version_intro" varchar DEFAULT 'Questions, custom requests, or styling advice — our team is here for you',
  	"version_form_heading" varchar DEFAULT 'SEND US A MESSAGE',
  	"version_form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.',
  	"version_form_name_label" varchar DEFAULT 'Name',
  	"version_form_email_label" varchar DEFAULT 'E-mail',
  	"version_form_message_label" varchar DEFAULT 'Message',
  	"version_form_submit_label" varchar DEFAULT 'SEND MESSAGE',
  	"version_form_footnote" varchar DEFAULT 'We’ll get back to you as soon as possible.',
  	"version_form_success_message" varchar DEFAULT 'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
  	"version_form_error_message" varchar DEFAULT 'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
  	"version_form_photo_id" integer,
  	"version_faq_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version__status" "enum__contact_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_contact_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "faq_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Frequently Asked Questions',
  	"empty_title" varchar DEFAULT 'Nothing here yet',
  	"empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"_status" "enum_faq_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_faq_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"version_empty_title" varchar DEFAULT 'Nothing here yet',
  	"version_empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version__status" "enum__faq_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enquiries_id" integer;
  ALTER TABLE "contact_settings" ADD COLUMN "enquiry_email" varchar;
  ALTER TABLE "story_page_blocks_page_header" ADD COLUMN "body" varchar;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD COLUMN "body" varchar;
  ALTER TABLE "contact_page" ADD CONSTRAINT "contact_page_form_photo_id_media_id_fk" FOREIGN KEY ("form_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_page" ADD CONSTRAINT "contact_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_page_rels" ADD CONSTRAINT "contact_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contact_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page_rels" ADD CONSTRAINT "contact_page_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v" ADD CONSTRAINT "_contact_page_v_version_form_photo_id_media_id_fk" FOREIGN KEY ("version_form_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contact_page_v" ADD CONSTRAINT "_contact_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contact_page_v_rels" ADD CONSTRAINT "_contact_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_contact_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v_rels" ADD CONSTRAINT "_contact_page_v_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_page" ADD CONSTRAINT "faq_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faq_page_v" ADD CONSTRAINT "_faq_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "enquiries_email_idx" ON "enquiries" USING btree ("email");
  CREATE INDEX "enquiries_sender_hash_idx" ON "enquiries" USING btree ("sender_hash");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE INDEX "contact_page_form_form_photo_idx" ON "contact_page" USING btree ("form_photo_id");
  CREATE INDEX "contact_page_seo_seo_image_idx" ON "contact_page" USING btree ("seo_image_id");
  CREATE INDEX "contact_page__status_idx" ON "contact_page" USING btree ("_status");
  CREATE INDEX "contact_page_rels_order_idx" ON "contact_page_rels" USING btree ("order");
  CREATE INDEX "contact_page_rels_parent_idx" ON "contact_page_rels" USING btree ("parent_id");
  CREATE INDEX "contact_page_rels_path_idx" ON "contact_page_rels" USING btree ("path");
  CREATE INDEX "contact_page_rels_questions_id_idx" ON "contact_page_rels" USING btree ("questions_id");
  CREATE INDEX "_contact_page_v_version_form_version_form_photo_idx" ON "_contact_page_v" USING btree ("version_form_photo_id");
  CREATE INDEX "_contact_page_v_version_seo_version_seo_image_idx" ON "_contact_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_contact_page_v_version_version__status_idx" ON "_contact_page_v" USING btree ("version__status");
  CREATE INDEX "_contact_page_v_created_at_idx" ON "_contact_page_v" USING btree ("created_at");
  CREATE INDEX "_contact_page_v_updated_at_idx" ON "_contact_page_v" USING btree ("updated_at");
  CREATE INDEX "_contact_page_v_latest_idx" ON "_contact_page_v" USING btree ("latest");
  CREATE INDEX "_contact_page_v_rels_order_idx" ON "_contact_page_v_rels" USING btree ("order");
  CREATE INDEX "_contact_page_v_rels_parent_idx" ON "_contact_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_contact_page_v_rels_path_idx" ON "_contact_page_v_rels" USING btree ("path");
  CREATE INDEX "_contact_page_v_rels_questions_id_idx" ON "_contact_page_v_rels" USING btree ("questions_id");
  CREATE INDEX "faq_page_seo_seo_image_idx" ON "faq_page" USING btree ("seo_image_id");
  CREATE INDEX "faq_page__status_idx" ON "faq_page" USING btree ("_status");
  CREATE INDEX "_faq_page_v_version_seo_version_seo_image_idx" ON "_faq_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_faq_page_v_version_version__status_idx" ON "_faq_page_v" USING btree ("version__status");
  CREATE INDEX "_faq_page_v_created_at_idx" ON "_faq_page_v" USING btree ("created_at");
  CREATE INDEX "_faq_page_v_updated_at_idx" ON "_faq_page_v" USING btree ("updated_at");
  CREATE INDEX "_faq_page_v_latest_idx" ON "_faq_page_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");`)
}

/**
 * **Hand-edited after the generated version failed (008/T022)** — the same two-line fix
 * `20260910_135959_blog_articles.ts` records at length, and for the identical reason.
 *
 * Payload generates the `down` in this order: drop the new tables with `CASCADE`, then drop the
 * foreign key `payload_locked_documents_rels` held against them. `DROP TABLE ... CASCADE` has
 * already removed that constraint, so the later `DROP CONSTRAINT` aborts the whole transaction:
 *
 *     constraint "payload_locked_documents_rels_enquiries_fk"
 *     of relation "payload_locked_documents_rels" does not exist
 *
 * That prior migration ends with a warning that regenerating reintroduces the bug. It was right:
 * this migration was generated fresh and shipped the identical broken rollback, found only by
 * running `pnpm payload migrate:down` — which is exactly what the Constitution's *Migrations* rule
 * asks for and the only thing that catches it.
 *
 * The two additive columns below (`contact_settings.enquiry_email`, and `body` on both
 * `page-header` block tables) are nullable, so this path loses no data for anything that existed
 * before the migration.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "enquiries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_page_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contact_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contact_page_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_faq_page_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "contact_page" CASCADE;
  DROP TABLE "contact_page_rels" CASCADE;
  DROP TABLE "_contact_page_v" CASCADE;
  DROP TABLE "_contact_page_v_rels" CASCADE;
  DROP TABLE "faq_page" CASCADE;
  DROP TABLE "_faq_page_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_enquiries_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_enquiries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enquiries_id";
  ALTER TABLE "contact_settings" DROP COLUMN "enquiry_email";
  ALTER TABLE "story_page_blocks_page_header" DROP COLUMN "body";
  ALTER TABLE "_story_page_v_blocks_page_header" DROP COLUMN "body";
  DROP TYPE "public"."enum_enquiries_notification";
  DROP TYPE "public"."enum_contact_page_status";
  DROP TYPE "public"."enum__contact_page_v_version_status";
  DROP TYPE "public"."enum_faq_page_status";
  DROP TYPE "public"."enum__faq_page_v_version_status";`)
}
