import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__questions_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_enquiries_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__policies_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__variants_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__story_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__blog_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__contact_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__faq_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum__cookie_settings_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categories_locales" (
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "collections_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sizes_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "attributes_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "questions_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_questions_v_locales" (
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "article_categories_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles_chapters_locales" (
  	"heading" varchar,
  	"toc_label" varchar,
  	"lede" varchar,
  	"body" jsonb,
  	"pull_quote" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"standfirst" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_version_chapters_locales" (
  	"heading" varchar,
  	"toc_label" varchar,
  	"lede" varchar,
  	"body" jsonb,
  	"pull_quote" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_standfirst" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "policies_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_policies_v_locales" (
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_locales" (
  	"title" varchar,
  	"description" varchar,
  	"details" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_version_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_details" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "shop_locales" (
  	"details_title" varchar DEFAULT 'PRODUCT DETAILS',
  	"warranty_title" varchar DEFAULT '3 YEAR WARRANTY + FREE RETURNS',
  	"delivery_title" varchar DEFAULT 'DELIVERY',
  	"warranty" jsonb,
  	"delivery" jsonb,
  	"listing_subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact_settings_locales" (
  	"address" varchar DEFAULT '12 Market Street, Old Town, Example City',
  	"opening_hours" varchar DEFAULT 'Daily · 10:00 AM–9:00 PM',
  	"message_template" varchar DEFAULT 'Hello Aurum, I would like to order:
  
  {{items}}
  
  Total: {{total}}
  
  {{customer}}',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_page_header_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_figures_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_banner_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_process_steps_steps_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_process_steps_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_faq_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_locales" (
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_page_header_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_figures_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_banner_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps_steps_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_faq_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_locales" (
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "blog_page_locales" (
  	"eyebrow" varchar DEFAULT 'OUR BLOG',
  	"heading" varchar DEFAULT 'Stories of diamonds, craftsmanship, and timeless beauty',
  	"empty_title" varchar DEFAULT 'Nothing published yet',
  	"empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_blog_page_v_locales" (
  	"version_eyebrow" varchar DEFAULT 'OUR BLOG',
  	"version_heading" varchar DEFAULT 'Stories of diamonds, craftsmanship, and timeless beauty',
  	"version_empty_title" varchar DEFAULT 'Nothing published yet',
  	"version_empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact_page_locales" (
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
  	"faq_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_contact_page_v_locales" (
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
  	"version_faq_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faq_page_locales" (
  	"heading" varchar DEFAULT 'Frequently Asked Questions',
  	"empty_title" varchar DEFAULT 'Nothing here yet',
  	"empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faq_page_v_locales" (
  	"version_heading" varchar DEFAULT 'Frequently Asked Questions',
  	"version_empty_title" varchar DEFAULT 'Nothing here yet',
  	"version_empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cookie_settings_categories_locales" (
  	"name" varchar,
  	"purpose" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cookie_settings_locales" (
  	"banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_cookie_settings_v_version_categories_locales" (
  	"name" varchar,
  	"purpose" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_cookie_settings_v_locales" (
  	"version_banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "_questions_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_questions_v" ADD COLUMN "published_locale" "enum__questions_v_published_locale";
  ALTER TABLE "_articles_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_articles_v" ADD COLUMN "published_locale" "enum__articles_v_published_locale";
  ALTER TABLE "enquiries" ADD COLUMN "locale" "enum_enquiries_locale" DEFAULT 'en' NOT NULL;
  ALTER TABLE "_policies_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_policies_v" ADD COLUMN "published_locale" "enum__policies_v_published_locale";
  ALTER TABLE "_variants_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_variants_v" ADD COLUMN "published_locale" "enum__variants_v_published_locale";
  ALTER TABLE "_products_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_products_v" ADD COLUMN "published_locale" "enum__products_v_published_locale";
  ALTER TABLE "_story_page_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_story_page_v" ADD COLUMN "published_locale" "enum__story_page_v_published_locale";
  ALTER TABLE "_blog_page_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_blog_page_v" ADD COLUMN "published_locale" "enum__blog_page_v_published_locale";
  ALTER TABLE "_contact_page_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_contact_page_v" ADD COLUMN "published_locale" "enum__contact_page_v_published_locale";
  ALTER TABLE "_faq_page_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_faq_page_v" ADD COLUMN "published_locale" "enum__faq_page_v_published_locale";
  ALTER TABLE "_cookie_settings_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_cookie_settings_v" ADD COLUMN "published_locale" "enum__cookie_settings_v_published_locale";
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_locales" ADD CONSTRAINT "collections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sizes_locales" ADD CONSTRAINT "sizes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_locales" ADD CONSTRAINT "attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questions_locales" ADD CONSTRAINT "questions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_questions_v_locales" ADD CONSTRAINT "_questions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_questions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "article_categories_locales" ADD CONSTRAINT "article_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_chapters_locales" ADD CONSTRAINT "articles_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_chapters_locales" ADD CONSTRAINT "_articles_v_version_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v_version_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policies_locales" ADD CONSTRAINT "policies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policies_v_locales" ADD CONSTRAINT "_policies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_attributes_locales" ADD CONSTRAINT "products_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes_locales" ADD CONSTRAINT "_products_v_version_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_locales" ADD CONSTRAINT "shop_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_settings_locales" ADD CONSTRAINT "contact_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_page_header_locales" ADD CONSTRAINT "story_page_blocks_page_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_page_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_chips_locales" ADD CONSTRAINT "story_page_blocks_closer_look_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_figures_locales" ADD CONSTRAINT "story_page_blocks_closer_look_figures_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_locales" ADD CONSTRAINT "story_page_blocks_closer_look_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner_locales" ADD CONSTRAINT "story_page_blocks_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps_locales" ADD CONSTRAINT "story_page_blocks_process_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_locales" ADD CONSTRAINT "story_page_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_faq_locales" ADD CONSTRAINT "story_page_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_locales" ADD CONSTRAINT "story_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_page_header_locales" ADD CONSTRAINT "_story_page_v_blocks_page_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_page_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_figures_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner_locales" ADD CONSTRAINT "_story_page_v_blocks_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps_locales" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_locales" ADD CONSTRAINT "_story_page_v_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_faq_locales" ADD CONSTRAINT "_story_page_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_locales" ADD CONSTRAINT "_story_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_page_locales" ADD CONSTRAINT "blog_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_page_v_locales" ADD CONSTRAINT "_blog_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page_locales" ADD CONSTRAINT "contact_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v_locales" ADD CONSTRAINT "_contact_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_page_locales" ADD CONSTRAINT "faq_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_page_v_locales" ADD CONSTRAINT "_faq_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings_categories_locales" ADD CONSTRAINT "cookie_settings_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings_locales" ADD CONSTRAINT "cookie_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_version_categories_locales" ADD CONSTRAINT "_cookie_settings_v_version_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v_version_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_locales" ADD CONSTRAINT "_cookie_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "collections_locales_locale_parent_id_unique" ON "collections_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sizes_locales_locale_parent_id_unique" ON "sizes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "attributes_locales_locale_parent_id_unique" ON "attributes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "questions_locales_locale_parent_id_unique" ON "questions_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_questions_v_locales_locale_parent_id_unique" ON "_questions_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "article_categories_locales_locale_parent_id_unique" ON "article_categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "articles_chapters_locales_locale_parent_id_unique" ON "articles_chapters_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_articles_v_version_chapters_locales_locale_parent_id_unique" ON "_articles_v_version_chapters_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "policies_locales_locale_parent_id_unique" ON "policies_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_policies_v_locales_locale_parent_id_unique" ON "_policies_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "products_attributes_locales_locale_parent_id_unique" ON "products_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_products_v_version_attributes_locales_locale_parent_id_uniq" ON "_products_v_version_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "shop_locales_locale_parent_id_unique" ON "shop_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "contact_settings_locales_locale_parent_id_unique" ON "contact_settings_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_page_header_locales_locale_parent_id_uniqu" ON "story_page_blocks_page_header_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_chips_locales_locale_parent_id" ON "story_page_blocks_closer_look_chips_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_figures_locales_locale_parent_" ON "story_page_blocks_closer_look_figures_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_locales_locale_parent_id_uniqu" ON "story_page_blocks_closer_look_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_banner_locales_locale_parent_id_unique" ON "story_page_blocks_banner_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_process_steps_steps_locales_locale_parent_" ON "story_page_blocks_process_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_process_steps_locales_locale_parent_id_uni" ON "story_page_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_faq_locales_locale_parent_id_unique" ON "story_page_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "story_page_locales_locale_parent_id_unique" ON "story_page_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_page_header_locales_locale_parent_id_un" ON "_story_page_v_blocks_page_header_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_chips_locales_locale_parent" ON "_story_page_v_blocks_closer_look_chips_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_figures_locales_locale_pare" ON "_story_page_v_blocks_closer_look_figures_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_locales_locale_parent_id_un" ON "_story_page_v_blocks_closer_look_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_banner_locales_locale_parent_id_unique" ON "_story_page_v_blocks_banner_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_process_steps_steps_locales_locale_pare" ON "_story_page_v_blocks_process_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_process_steps_locales_locale_parent_id_" ON "_story_page_v_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_faq_locales_locale_parent_id_unique" ON "_story_page_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_locales_locale_parent_id_unique" ON "_story_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "blog_page_locales_locale_parent_id_unique" ON "blog_page_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_blog_page_v_locales_locale_parent_id_unique" ON "_blog_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "contact_page_locales_locale_parent_id_unique" ON "contact_page_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_contact_page_v_locales_locale_parent_id_unique" ON "_contact_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "faq_page_locales_locale_parent_id_unique" ON "faq_page_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_faq_page_v_locales_locale_parent_id_unique" ON "_faq_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "cookie_settings_categories_locales_locale_parent_id_unique" ON "cookie_settings_categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "cookie_settings_locales_locale_parent_id_unique" ON "cookie_settings_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_cookie_settings_v_version_categories_locales_locale_parent_" ON "_cookie_settings_v_version_categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_cookie_settings_v_locales_locale_parent_id_unique" ON "_cookie_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_questions_v_snapshot_idx" ON "_questions_v" USING btree ("snapshot");
  CREATE INDEX "_questions_v_published_locale_idx" ON "_questions_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_policies_v_snapshot_idx" ON "_policies_v" USING btree ("snapshot");
  CREATE INDEX "_policies_v_published_locale_idx" ON "_policies_v" USING btree ("published_locale");
  CREATE INDEX "_variants_v_snapshot_idx" ON "_variants_v" USING btree ("snapshot");
  CREATE INDEX "_variants_v_published_locale_idx" ON "_variants_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_story_page_v_snapshot_idx" ON "_story_page_v" USING btree ("snapshot");
  CREATE INDEX "_story_page_v_published_locale_idx" ON "_story_page_v" USING btree ("published_locale");
  CREATE INDEX "_blog_page_v_snapshot_idx" ON "_blog_page_v" USING btree ("snapshot");
  CREATE INDEX "_blog_page_v_published_locale_idx" ON "_blog_page_v" USING btree ("published_locale");
  CREATE INDEX "_contact_page_v_snapshot_idx" ON "_contact_page_v" USING btree ("snapshot");
  CREATE INDEX "_contact_page_v_published_locale_idx" ON "_contact_page_v" USING btree ("published_locale");
  CREATE INDEX "_faq_page_v_snapshot_idx" ON "_faq_page_v" USING btree ("snapshot");
  CREATE INDEX "_faq_page_v_published_locale_idx" ON "_faq_page_v" USING btree ("published_locale");
  CREATE INDEX "_cookie_settings_v_snapshot_idx" ON "_cookie_settings_v" USING btree ("snapshot");
  CREATE INDEX "_cookie_settings_v_published_locale_idx" ON "_cookie_settings_v" USING btree ("published_locale");
`)

  /*
    **The generated migration does not carry data, and this is the part that does.**

    `payload migrate:create` emits 48 `CREATE TABLE *_locales` and 157 `ALTER TABLE … DROP COLUMN`
    and nothing in between. Run as generated it would empty every translated field on the site —
    every product description, every policy, every heading — because the columns are dropped from
    the parent table after the new table is created and before anything has been written into it.

    Each statement below moves one table's words into their `_locales` sibling as English. They run
    between the creates and the drops, which is the only window in which both sides exist.

    Ordered parent-first only by accident of generation; it does not matter, because no statement
    here reads a table another one writes.
  */
  await db.execute(sql`
  INSERT INTO "media_locales" ("_locale", "_parent_id", "alt")
  SELECT 'en', "id", "alt" FROM "media";
  INSERT INTO "categories_locales" ("_locale", "_parent_id", "title", "subtitle", "seo_title", "seo_description")
  SELECT 'en', "id", "title", "subtitle", "seo_title", "seo_description" FROM "categories";
  INSERT INTO "collections_locales" ("_locale", "_parent_id", "title", "description")
  SELECT 'en', "id", "title", "description" FROM "collections";
  INSERT INTO "sizes_locales" ("_locale", "_parent_id", "label")
  SELECT 'en', "id", "label" FROM "sizes";
  INSERT INTO "attributes_locales" ("_locale", "_parent_id", "label")
  SELECT 'en', "id", "label" FROM "attributes";
  INSERT INTO "questions_locales" ("_locale", "_parent_id", "question", "answer")
  SELECT 'en', "id", "question", "answer" FROM "questions";
  INSERT INTO "_questions_v_locales" ("_locale", "_parent_id", "version_question", "version_answer")
  SELECT 'en', "id", "version_question", "version_answer" FROM "_questions_v";
  INSERT INTO "article_categories_locales" ("_locale", "_parent_id", "title")
  SELECT 'en', "id", "title" FROM "article_categories";
  INSERT INTO "articles_chapters_locales" ("_locale", "_parent_id", "heading", "toc_label", "lede", "body", "pull_quote")
  SELECT 'en', "id", "heading", "toc_label", "lede", "body", "pull_quote" FROM "articles_chapters";
  INSERT INTO "articles_locales" ("_locale", "_parent_id", "title", "standfirst", "seo_title", "seo_description")
  SELECT 'en', "id", "title", "standfirst", "seo_title", "seo_description" FROM "articles";
  INSERT INTO "_articles_v_version_chapters_locales" ("_locale", "_parent_id", "heading", "toc_label", "lede", "body", "pull_quote")
  SELECT 'en', "id", "heading", "toc_label", "lede", "body", "pull_quote" FROM "_articles_v_version_chapters";
  INSERT INTO "_articles_v_locales" ("_locale", "_parent_id", "version_title", "version_standfirst", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_title", "version_standfirst", "version_seo_title", "version_seo_description" FROM "_articles_v";
  INSERT INTO "policies_locales" ("_locale", "_parent_id", "title", "subtitle", "body", "seo_title", "seo_description")
  SELECT 'en', "id", "title", "subtitle", "body", "seo_title", "seo_description" FROM "policies";
  INSERT INTO "_policies_v_locales" ("_locale", "_parent_id", "version_title", "version_subtitle", "version_body", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_title", "version_subtitle", "version_body", "version_seo_title", "version_seo_description" FROM "_policies_v";
  INSERT INTO "products_attributes_locales" ("_locale", "_parent_id", "value")
  SELECT 'en', "id", "value" FROM "products_attributes";
  INSERT INTO "products_locales" ("_locale", "_parent_id", "title", "description", "details", "seo_title", "seo_description")
  SELECT 'en', "id", "title", "description", "details", "seo_title", "seo_description" FROM "products";
  INSERT INTO "_products_v_version_attributes_locales" ("_locale", "_parent_id", "value")
  SELECT 'en', "id", "value" FROM "_products_v_version_attributes";
  INSERT INTO "_products_v_locales" ("_locale", "_parent_id", "version_title", "version_description", "version_details", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_title", "version_description", "version_details", "version_seo_title", "version_seo_description" FROM "_products_v";
  INSERT INTO "shop_locales" ("_locale", "_parent_id", "details_title", "warranty_title", "delivery_title", "warranty", "delivery", "listing_subtitle")
  SELECT 'en', "id", "details_title", "warranty_title", "delivery_title", "warranty", "delivery", "listing_subtitle" FROM "shop";
  INSERT INTO "contact_settings_locales" ("_locale", "_parent_id", "address", "opening_hours", "message_template")
  SELECT 'en', "id", "address", "opening_hours", "message_template" FROM "contact_settings";
  INSERT INTO "story_page_blocks_page_header_locales" ("_locale", "_parent_id", "eyebrow", "heading", "body")
  SELECT 'en', "id", "eyebrow", "heading", "body" FROM "story_page_blocks_page_header";
  INSERT INTO "story_page_blocks_closer_look_chips_locales" ("_locale", "_parent_id", "label")
  SELECT 'en', "id", "label" FROM "story_page_blocks_closer_look_chips";
  INSERT INTO "story_page_blocks_closer_look_figures_locales" ("_locale", "_parent_id", "caption")
  SELECT 'en', "id", "caption" FROM "story_page_blocks_closer_look_figures";
  INSERT INTO "story_page_blocks_closer_look_locales" ("_locale", "_parent_id", "body")
  SELECT 'en', "id", "body" FROM "story_page_blocks_closer_look";
  INSERT INTO "story_page_blocks_banner_locales" ("_locale", "_parent_id", "eyebrow", "heading", "body", "cta_label")
  SELECT 'en', "id", "eyebrow", "heading", "body", "cta_label" FROM "story_page_blocks_banner";
  INSERT INTO "story_page_blocks_process_steps_steps_locales" ("_locale", "_parent_id", "title", "caption")
  SELECT 'en', "id", "title", "caption" FROM "story_page_blocks_process_steps_steps";
  INSERT INTO "story_page_blocks_process_steps_locales" ("_locale", "_parent_id", "heading")
  SELECT 'en', "id", "heading" FROM "story_page_blocks_process_steps";
  INSERT INTO "story_page_blocks_faq_locales" ("_locale", "_parent_id", "heading", "body", "cta_label")
  SELECT 'en', "id", "heading", "body", "cta_label" FROM "story_page_blocks_faq";
  INSERT INTO "story_page_locales" ("_locale", "_parent_id", "seo_title", "seo_description")
  SELECT 'en', "id", "seo_title", "seo_description" FROM "story_page";
  INSERT INTO "_story_page_v_blocks_page_header_locales" ("_locale", "_parent_id", "eyebrow", "heading", "body")
  SELECT 'en', "id", "eyebrow", "heading", "body" FROM "_story_page_v_blocks_page_header";
  INSERT INTO "_story_page_v_blocks_closer_look_chips_locales" ("_locale", "_parent_id", "label")
  SELECT 'en', "id", "label" FROM "_story_page_v_blocks_closer_look_chips";
  INSERT INTO "_story_page_v_blocks_closer_look_figures_locales" ("_locale", "_parent_id", "caption")
  SELECT 'en', "id", "caption" FROM "_story_page_v_blocks_closer_look_figures";
  INSERT INTO "_story_page_v_blocks_closer_look_locales" ("_locale", "_parent_id", "body")
  SELECT 'en', "id", "body" FROM "_story_page_v_blocks_closer_look";
  INSERT INTO "_story_page_v_blocks_banner_locales" ("_locale", "_parent_id", "eyebrow", "heading", "body", "cta_label")
  SELECT 'en', "id", "eyebrow", "heading", "body", "cta_label" FROM "_story_page_v_blocks_banner";
  INSERT INTO "_story_page_v_blocks_process_steps_steps_locales" ("_locale", "_parent_id", "title", "caption")
  SELECT 'en', "id", "title", "caption" FROM "_story_page_v_blocks_process_steps_steps";
  INSERT INTO "_story_page_v_blocks_process_steps_locales" ("_locale", "_parent_id", "heading")
  SELECT 'en', "id", "heading" FROM "_story_page_v_blocks_process_steps";
  INSERT INTO "_story_page_v_blocks_faq_locales" ("_locale", "_parent_id", "heading", "body", "cta_label")
  SELECT 'en', "id", "heading", "body", "cta_label" FROM "_story_page_v_blocks_faq";
  INSERT INTO "_story_page_v_locales" ("_locale", "_parent_id", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_seo_title", "version_seo_description" FROM "_story_page_v";
  INSERT INTO "blog_page_locales" ("_locale", "_parent_id", "eyebrow", "heading", "empty_title", "empty_description", "seo_title", "seo_description")
  SELECT 'en', "id", "eyebrow", "heading", "empty_title", "empty_description", "seo_title", "seo_description" FROM "blog_page";
  INSERT INTO "_blog_page_v_locales" ("_locale", "_parent_id", "version_eyebrow", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_eyebrow", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description" FROM "_blog_page_v";
  INSERT INTO "contact_page_locales" ("_locale", "_parent_id", "eyebrow", "heading", "intro", "form_heading", "form_body", "form_name_label", "form_email_label", "form_message_label", "form_submit_label", "form_footnote", "form_success_message", "form_error_message", "faq_heading", "seo_title", "seo_description")
  SELECT 'en', "id", "eyebrow", "heading", "intro", "form_heading", "form_body", "form_name_label", "form_email_label", "form_message_label", "form_submit_label", "form_footnote", "form_success_message", "form_error_message", "faq_heading", "seo_title", "seo_description" FROM "contact_page";
  INSERT INTO "_contact_page_v_locales" ("_locale", "_parent_id", "version_eyebrow", "version_heading", "version_intro", "version_form_heading", "version_form_body", "version_form_name_label", "version_form_email_label", "version_form_message_label", "version_form_submit_label", "version_form_footnote", "version_form_success_message", "version_form_error_message", "version_faq_heading", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_eyebrow", "version_heading", "version_intro", "version_form_heading", "version_form_body", "version_form_name_label", "version_form_email_label", "version_form_message_label", "version_form_submit_label", "version_form_footnote", "version_form_success_message", "version_form_error_message", "version_faq_heading", "version_seo_title", "version_seo_description" FROM "_contact_page_v";
  INSERT INTO "faq_page_locales" ("_locale", "_parent_id", "heading", "empty_title", "empty_description", "seo_title", "seo_description")
  SELECT 'en', "id", "heading", "empty_title", "empty_description", "seo_title", "seo_description" FROM "faq_page";
  INSERT INTO "_faq_page_v_locales" ("_locale", "_parent_id", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description")
  SELECT 'en', "id", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description" FROM "_faq_page_v";
  INSERT INTO "cookie_settings_categories_locales" ("_locale", "_parent_id", "name", "purpose")
  SELECT 'en', "id", "name", "purpose" FROM "cookie_settings_categories";
  INSERT INTO "cookie_settings_locales" ("_locale", "_parent_id", "banner_body")
  SELECT 'en', "id", "banner_body" FROM "cookie_settings";
  INSERT INTO "_cookie_settings_v_version_categories_locales" ("_locale", "_parent_id", "name", "purpose")
  SELECT 'en', "id", "name", "purpose" FROM "_cookie_settings_v_version_categories";
  INSERT INTO "_cookie_settings_v_locales" ("_locale", "_parent_id", "version_banner_body")
  SELECT 'en', "id", "version_banner_body" FROM "_cookie_settings_v";`)

  await db.execute(sql`
  ALTER TABLE "media" DROP COLUMN "alt";
  ALTER TABLE "categories" DROP COLUMN "title";
  ALTER TABLE "categories" DROP COLUMN "subtitle";
  ALTER TABLE "categories" DROP COLUMN "seo_title";
  ALTER TABLE "categories" DROP COLUMN "seo_description";
  ALTER TABLE "collections" DROP COLUMN "title";
  ALTER TABLE "collections" DROP COLUMN "description";
  ALTER TABLE "sizes" DROP COLUMN "label";
  ALTER TABLE "attributes" DROP COLUMN "label";
  ALTER TABLE "questions" DROP COLUMN "question";
  ALTER TABLE "questions" DROP COLUMN "answer";
  ALTER TABLE "_questions_v" DROP COLUMN "version_question";
  ALTER TABLE "_questions_v" DROP COLUMN "version_answer";
  ALTER TABLE "article_categories" DROP COLUMN "title";
  ALTER TABLE "articles_chapters" DROP COLUMN "heading";
  ALTER TABLE "articles_chapters" DROP COLUMN "toc_label";
  ALTER TABLE "articles_chapters" DROP COLUMN "lede";
  ALTER TABLE "articles_chapters" DROP COLUMN "body";
  ALTER TABLE "articles_chapters" DROP COLUMN "pull_quote";
  ALTER TABLE "articles" DROP COLUMN "title";
  ALTER TABLE "articles" DROP COLUMN "standfirst";
  ALTER TABLE "articles" DROP COLUMN "seo_title";
  ALTER TABLE "articles" DROP COLUMN "seo_description";
  ALTER TABLE "_articles_v_version_chapters" DROP COLUMN "heading";
  ALTER TABLE "_articles_v_version_chapters" DROP COLUMN "toc_label";
  ALTER TABLE "_articles_v_version_chapters" DROP COLUMN "lede";
  ALTER TABLE "_articles_v_version_chapters" DROP COLUMN "body";
  ALTER TABLE "_articles_v_version_chapters" DROP COLUMN "pull_quote";
  ALTER TABLE "_articles_v" DROP COLUMN "version_title";
  ALTER TABLE "_articles_v" DROP COLUMN "version_standfirst";
  ALTER TABLE "_articles_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_articles_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "policies" DROP COLUMN "title";
  ALTER TABLE "policies" DROP COLUMN "subtitle";
  ALTER TABLE "policies" DROP COLUMN "body";
  ALTER TABLE "policies" DROP COLUMN "seo_title";
  ALTER TABLE "policies" DROP COLUMN "seo_description";
  ALTER TABLE "_policies_v" DROP COLUMN "version_title";
  ALTER TABLE "_policies_v" DROP COLUMN "version_subtitle";
  ALTER TABLE "_policies_v" DROP COLUMN "version_body";
  ALTER TABLE "_policies_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_policies_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "products_attributes" DROP COLUMN "value";
  ALTER TABLE "products" DROP COLUMN "title";
  ALTER TABLE "products" DROP COLUMN "description";
  ALTER TABLE "products" DROP COLUMN "details";
  ALTER TABLE "products" DROP COLUMN "seo_title";
  ALTER TABLE "products" DROP COLUMN "seo_description";
  ALTER TABLE "_products_v_version_attributes" DROP COLUMN "value";
  ALTER TABLE "_products_v" DROP COLUMN "version_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_description";
  ALTER TABLE "_products_v" DROP COLUMN "version_details";
  ALTER TABLE "_products_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "shop" DROP COLUMN "details_title";
  ALTER TABLE "shop" DROP COLUMN "warranty_title";
  ALTER TABLE "shop" DROP COLUMN "delivery_title";
  ALTER TABLE "shop" DROP COLUMN "warranty";
  ALTER TABLE "shop" DROP COLUMN "delivery";
  ALTER TABLE "shop" DROP COLUMN "listing_subtitle";
  ALTER TABLE "contact_settings" DROP COLUMN "address";
  ALTER TABLE "contact_settings" DROP COLUMN "opening_hours";
  ALTER TABLE "contact_settings" DROP COLUMN "message_template";
  ALTER TABLE "story_page_blocks_page_header" DROP COLUMN "eyebrow";
  ALTER TABLE "story_page_blocks_page_header" DROP COLUMN "heading";
  ALTER TABLE "story_page_blocks_page_header" DROP COLUMN "body";
  ALTER TABLE "story_page_blocks_closer_look_chips" DROP COLUMN "label";
  ALTER TABLE "story_page_blocks_closer_look_figures" DROP COLUMN "caption";
  ALTER TABLE "story_page_blocks_closer_look" DROP COLUMN "body";
  ALTER TABLE "story_page_blocks_banner" DROP COLUMN "eyebrow";
  ALTER TABLE "story_page_blocks_banner" DROP COLUMN "heading";
  ALTER TABLE "story_page_blocks_banner" DROP COLUMN "body";
  ALTER TABLE "story_page_blocks_banner" DROP COLUMN "cta_label";
  ALTER TABLE "story_page_blocks_process_steps_steps" DROP COLUMN "title";
  ALTER TABLE "story_page_blocks_process_steps_steps" DROP COLUMN "caption";
  ALTER TABLE "story_page_blocks_process_steps" DROP COLUMN "heading";
  ALTER TABLE "story_page_blocks_faq" DROP COLUMN "heading";
  ALTER TABLE "story_page_blocks_faq" DROP COLUMN "body";
  ALTER TABLE "story_page_blocks_faq" DROP COLUMN "cta_label";
  ALTER TABLE "story_page" DROP COLUMN "seo_title";
  ALTER TABLE "story_page" DROP COLUMN "seo_description";
  ALTER TABLE "_story_page_v_blocks_page_header" DROP COLUMN "eyebrow";
  ALTER TABLE "_story_page_v_blocks_page_header" DROP COLUMN "heading";
  ALTER TABLE "_story_page_v_blocks_page_header" DROP COLUMN "body";
  ALTER TABLE "_story_page_v_blocks_closer_look_chips" DROP COLUMN "label";
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" DROP COLUMN "caption";
  ALTER TABLE "_story_page_v_blocks_closer_look" DROP COLUMN "body";
  ALTER TABLE "_story_page_v_blocks_banner" DROP COLUMN "eyebrow";
  ALTER TABLE "_story_page_v_blocks_banner" DROP COLUMN "heading";
  ALTER TABLE "_story_page_v_blocks_banner" DROP COLUMN "body";
  ALTER TABLE "_story_page_v_blocks_banner" DROP COLUMN "cta_label";
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" DROP COLUMN "title";
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" DROP COLUMN "caption";
  ALTER TABLE "_story_page_v_blocks_process_steps" DROP COLUMN "heading";
  ALTER TABLE "_story_page_v_blocks_faq" DROP COLUMN "heading";
  ALTER TABLE "_story_page_v_blocks_faq" DROP COLUMN "body";
  ALTER TABLE "_story_page_v_blocks_faq" DROP COLUMN "cta_label";
  ALTER TABLE "_story_page_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_story_page_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "blog_page" DROP COLUMN "eyebrow";
  ALTER TABLE "blog_page" DROP COLUMN "heading";
  ALTER TABLE "blog_page" DROP COLUMN "empty_title";
  ALTER TABLE "blog_page" DROP COLUMN "empty_description";
  ALTER TABLE "blog_page" DROP COLUMN "seo_title";
  ALTER TABLE "blog_page" DROP COLUMN "seo_description";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_eyebrow";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_heading";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_empty_title";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_empty_description";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_blog_page_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "contact_page" DROP COLUMN "eyebrow";
  ALTER TABLE "contact_page" DROP COLUMN "heading";
  ALTER TABLE "contact_page" DROP COLUMN "intro";
  ALTER TABLE "contact_page" DROP COLUMN "form_heading";
  ALTER TABLE "contact_page" DROP COLUMN "form_body";
  ALTER TABLE "contact_page" DROP COLUMN "form_name_label";
  ALTER TABLE "contact_page" DROP COLUMN "form_email_label";
  ALTER TABLE "contact_page" DROP COLUMN "form_message_label";
  ALTER TABLE "contact_page" DROP COLUMN "form_submit_label";
  ALTER TABLE "contact_page" DROP COLUMN "form_footnote";
  ALTER TABLE "contact_page" DROP COLUMN "form_success_message";
  ALTER TABLE "contact_page" DROP COLUMN "form_error_message";
  ALTER TABLE "contact_page" DROP COLUMN "faq_heading";
  ALTER TABLE "contact_page" DROP COLUMN "seo_title";
  ALTER TABLE "contact_page" DROP COLUMN "seo_description";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_eyebrow";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_heading";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_intro";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_heading";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_body";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_name_label";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_email_label";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_message_label";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_submit_label";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_footnote";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_success_message";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_form_error_message";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_faq_heading";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_contact_page_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "faq_page" DROP COLUMN "heading";
  ALTER TABLE "faq_page" DROP COLUMN "empty_title";
  ALTER TABLE "faq_page" DROP COLUMN "empty_description";
  ALTER TABLE "faq_page" DROP COLUMN "seo_title";
  ALTER TABLE "faq_page" DROP COLUMN "seo_description";
  ALTER TABLE "_faq_page_v" DROP COLUMN "version_heading";
  ALTER TABLE "_faq_page_v" DROP COLUMN "version_empty_title";
  ALTER TABLE "_faq_page_v" DROP COLUMN "version_empty_description";
  ALTER TABLE "_faq_page_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_faq_page_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "cookie_settings_categories" DROP COLUMN "name";
  ALTER TABLE "cookie_settings_categories" DROP COLUMN "purpose";
  ALTER TABLE "cookie_settings" DROP COLUMN "banner_body";
  ALTER TABLE "_cookie_settings_v_version_categories" DROP COLUMN "name";
  ALTER TABLE "_cookie_settings_v_version_categories" DROP COLUMN "purpose";
  ALTER TABLE "_cookie_settings_v" DROP COLUMN "version_banner_body";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  /*
    **The rollback carries the words back, and has to stash them first.**

    The generated `down` drops every `_locales` table (line ~50 below) BEFORE it re-adds the parent
    columns (~line 120), so by the time there is somewhere to put the English text it has already
    been deleted. Rather than reorder a hundred generated statements — each of which may depend on
    the last — this copies what is needed into holding tables, lets the generated SQL run untouched,
    and puts the words back afterwards.

    A rollback nobody has run is not a rollback path (Constitution IV). This one is rehearsed in
    `quickstart.md` §1, in both directions, against a restored copy.
  */
  await db.execute(sql`
  CREATE TABLE "_carry_media" AS SELECT "_parent_id", "alt" FROM "media_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_categories" AS SELECT "_parent_id", "title", "subtitle", "seo_title", "seo_description" FROM "categories_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_collections" AS SELECT "_parent_id", "title", "description" FROM "collections_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_sizes" AS SELECT "_parent_id", "label" FROM "sizes_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_attributes" AS SELECT "_parent_id", "label" FROM "attributes_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_questions" AS SELECT "_parent_id", "question", "answer" FROM "questions_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__questions_v" AS SELECT "_parent_id", "version_question", "version_answer" FROM "_questions_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_article_categories" AS SELECT "_parent_id", "title" FROM "article_categories_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_articles_chapters" AS SELECT "_parent_id", "heading", "toc_label", "lede", "body", "pull_quote" FROM "articles_chapters_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_articles" AS SELECT "_parent_id", "title", "standfirst", "seo_title", "seo_description" FROM "articles_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__articles_v_version_chapters" AS SELECT "_parent_id", "heading", "toc_label", "lede", "body", "pull_quote" FROM "_articles_v_version_chapters_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__articles_v" AS SELECT "_parent_id", "version_title", "version_standfirst", "version_seo_title", "version_seo_description" FROM "_articles_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_policies" AS SELECT "_parent_id", "title", "subtitle", "body", "seo_title", "seo_description" FROM "policies_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__policies_v" AS SELECT "_parent_id", "version_title", "version_subtitle", "version_body", "version_seo_title", "version_seo_description" FROM "_policies_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_products_attributes" AS SELECT "_parent_id", "value" FROM "products_attributes_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_products" AS SELECT "_parent_id", "title", "description", "details", "seo_title", "seo_description" FROM "products_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__products_v_version_attributes" AS SELECT "_parent_id", "value" FROM "_products_v_version_attributes_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__products_v" AS SELECT "_parent_id", "version_title", "version_description", "version_details", "version_seo_title", "version_seo_description" FROM "_products_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_shop" AS SELECT "_parent_id", "details_title", "warranty_title", "delivery_title", "warranty", "delivery", "listing_subtitle" FROM "shop_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_contact_settings" AS SELECT "_parent_id", "address", "opening_hours", "message_template" FROM "contact_settings_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_page_header" AS SELECT "_parent_id", "eyebrow", "heading", "body" FROM "story_page_blocks_page_header_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_closer_look_chips" AS SELECT "_parent_id", "label" FROM "story_page_blocks_closer_look_chips_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_closer_look_figures" AS SELECT "_parent_id", "caption" FROM "story_page_blocks_closer_look_figures_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_closer_look" AS SELECT "_parent_id", "body" FROM "story_page_blocks_closer_look_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_banner" AS SELECT "_parent_id", "eyebrow", "heading", "body", "cta_label" FROM "story_page_blocks_banner_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_process_steps_steps" AS SELECT "_parent_id", "title", "caption" FROM "story_page_blocks_process_steps_steps_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_process_steps" AS SELECT "_parent_id", "heading" FROM "story_page_blocks_process_steps_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page_blocks_faq" AS SELECT "_parent_id", "heading", "body", "cta_label" FROM "story_page_blocks_faq_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_story_page" AS SELECT "_parent_id", "seo_title", "seo_description" FROM "story_page_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_page_header" AS SELECT "_parent_id", "eyebrow", "heading", "body" FROM "_story_page_v_blocks_page_header_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_closer_look_chips" AS SELECT "_parent_id", "label" FROM "_story_page_v_blocks_closer_look_chips_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_closer_look_figures" AS SELECT "_parent_id", "caption" FROM "_story_page_v_blocks_closer_look_figures_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_closer_look" AS SELECT "_parent_id", "body" FROM "_story_page_v_blocks_closer_look_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_banner" AS SELECT "_parent_id", "eyebrow", "heading", "body", "cta_label" FROM "_story_page_v_blocks_banner_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_process_steps_steps" AS SELECT "_parent_id", "title", "caption" FROM "_story_page_v_blocks_process_steps_steps_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_process_steps" AS SELECT "_parent_id", "heading" FROM "_story_page_v_blocks_process_steps_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v_blocks_faq" AS SELECT "_parent_id", "heading", "body", "cta_label" FROM "_story_page_v_blocks_faq_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__story_page_v" AS SELECT "_parent_id", "version_seo_title", "version_seo_description" FROM "_story_page_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_blog_page" AS SELECT "_parent_id", "eyebrow", "heading", "empty_title", "empty_description", "seo_title", "seo_description" FROM "blog_page_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__blog_page_v" AS SELECT "_parent_id", "version_eyebrow", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description" FROM "_blog_page_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_contact_page" AS SELECT "_parent_id", "eyebrow", "heading", "intro", "form_heading", "form_body", "form_name_label", "form_email_label", "form_message_label", "form_submit_label", "form_footnote", "form_success_message", "form_error_message", "faq_heading", "seo_title", "seo_description" FROM "contact_page_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__contact_page_v" AS SELECT "_parent_id", "version_eyebrow", "version_heading", "version_intro", "version_form_heading", "version_form_body", "version_form_name_label", "version_form_email_label", "version_form_message_label", "version_form_submit_label", "version_form_footnote", "version_form_success_message", "version_form_error_message", "version_faq_heading", "version_seo_title", "version_seo_description" FROM "_contact_page_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_faq_page" AS SELECT "_parent_id", "heading", "empty_title", "empty_description", "seo_title", "seo_description" FROM "faq_page_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__faq_page_v" AS SELECT "_parent_id", "version_heading", "version_empty_title", "version_empty_description", "version_seo_title", "version_seo_description" FROM "_faq_page_v_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_cookie_settings_categories" AS SELECT "_parent_id", "name", "purpose" FROM "cookie_settings_categories_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry_cookie_settings" AS SELECT "_parent_id", "banner_body" FROM "cookie_settings_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__cookie_settings_v_version_categories" AS SELECT "_parent_id", "name", "purpose" FROM "_cookie_settings_v_version_categories_locales" WHERE "_locale" = 'en';
  CREATE TABLE "_carry__cookie_settings_v" AS SELECT "_parent_id", "version_banner_body" FROM "_cookie_settings_v_locales" WHERE "_locale" = 'en';`)

  await db.execute(sql`
   ALTER TABLE "media_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sizes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attributes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "questions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_questions_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "article_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_chapters_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_version_chapters_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "policies_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_policies_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_attributes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_attributes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_page_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look_chips_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look_figures_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_closer_look_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_process_steps_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_process_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "story_page_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_page_header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_closer_look_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_process_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_story_page_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog_page_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blog_page_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_page_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contact_page_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq_page_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_faq_page_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cookie_settings_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cookie_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cookie_settings_v_version_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cookie_settings_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "collections_locales" CASCADE;
  DROP TABLE "sizes_locales" CASCADE;
  DROP TABLE "attributes_locales" CASCADE;
  DROP TABLE "questions_locales" CASCADE;
  DROP TABLE "_questions_v_locales" CASCADE;
  DROP TABLE "article_categories_locales" CASCADE;
  DROP TABLE "articles_chapters_locales" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "_articles_v_version_chapters_locales" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "policies_locales" CASCADE;
  DROP TABLE "_policies_v_locales" CASCADE;
  DROP TABLE "products_attributes_locales" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "_products_v_version_attributes_locales" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "shop_locales" CASCADE;
  DROP TABLE "contact_settings_locales" CASCADE;
  DROP TABLE "story_page_blocks_page_header_locales" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_chips_locales" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_figures_locales" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_locales" CASCADE;
  DROP TABLE "story_page_blocks_banner_locales" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_steps_locales" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_locales" CASCADE;
  DROP TABLE "story_page_blocks_faq_locales" CASCADE;
  DROP TABLE "story_page_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_page_header_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_chips_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_figures_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_banner_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_steps_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_story_page_v_locales" CASCADE;
  DROP TABLE "blog_page_locales" CASCADE;
  DROP TABLE "_blog_page_v_locales" CASCADE;
  DROP TABLE "contact_page_locales" CASCADE;
  DROP TABLE "_contact_page_v_locales" CASCADE;
  DROP TABLE "faq_page_locales" CASCADE;
  DROP TABLE "_faq_page_v_locales" CASCADE;
  DROP TABLE "cookie_settings_categories_locales" CASCADE;
  DROP TABLE "cookie_settings_locales" CASCADE;
  DROP TABLE "_cookie_settings_v_version_categories_locales" CASCADE;
  DROP TABLE "_cookie_settings_v_locales" CASCADE;
  DROP INDEX "_questions_v_snapshot_idx";
  DROP INDEX "_questions_v_published_locale_idx";
  DROP INDEX "_articles_v_snapshot_idx";
  DROP INDEX "_articles_v_published_locale_idx";
  DROP INDEX "_policies_v_snapshot_idx";
  DROP INDEX "_policies_v_published_locale_idx";
  DROP INDEX "_variants_v_snapshot_idx";
  DROP INDEX "_variants_v_published_locale_idx";
  DROP INDEX "_products_v_snapshot_idx";
  DROP INDEX "_products_v_published_locale_idx";
  DROP INDEX "_story_page_v_snapshot_idx";
  DROP INDEX "_story_page_v_published_locale_idx";
  DROP INDEX "_blog_page_v_snapshot_idx";
  DROP INDEX "_blog_page_v_published_locale_idx";
  DROP INDEX "_contact_page_v_snapshot_idx";
  DROP INDEX "_contact_page_v_published_locale_idx";
  DROP INDEX "_faq_page_v_snapshot_idx";
  DROP INDEX "_faq_page_v_published_locale_idx";
  DROP INDEX "_cookie_settings_v_snapshot_idx";
  DROP INDEX "_cookie_settings_v_published_locale_idx";
  ALTER TABLE "media" ADD COLUMN "alt" varchar;
  ALTER TABLE "categories" ADD COLUMN "title" varchar;
  ALTER TABLE "categories" ADD COLUMN "subtitle" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "collections" ADD COLUMN "title" varchar;
  ALTER TABLE "collections" ADD COLUMN "description" varchar;
  ALTER TABLE "sizes" ADD COLUMN "label" varchar;
  ALTER TABLE "attributes" ADD COLUMN "label" varchar;
  ALTER TABLE "questions" ADD COLUMN "question" varchar;
  ALTER TABLE "questions" ADD COLUMN "answer" jsonb;
  ALTER TABLE "_questions_v" ADD COLUMN "version_question" varchar;
  ALTER TABLE "_questions_v" ADD COLUMN "version_answer" jsonb;
  ALTER TABLE "article_categories" ADD COLUMN "title" varchar;
  ALTER TABLE "articles_chapters" ADD COLUMN "heading" varchar;
  ALTER TABLE "articles_chapters" ADD COLUMN "toc_label" varchar;
  ALTER TABLE "articles_chapters" ADD COLUMN "lede" varchar;
  ALTER TABLE "articles_chapters" ADD COLUMN "body" jsonb;
  ALTER TABLE "articles_chapters" ADD COLUMN "pull_quote" varchar;
  ALTER TABLE "articles" ADD COLUMN "title" varchar;
  ALTER TABLE "articles" ADD COLUMN "standfirst" varchar;
  ALTER TABLE "articles" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "articles" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_articles_v_version_chapters" ADD COLUMN "heading" varchar;
  ALTER TABLE "_articles_v_version_chapters" ADD COLUMN "toc_label" varchar;
  ALTER TABLE "_articles_v_version_chapters" ADD COLUMN "lede" varchar;
  ALTER TABLE "_articles_v_version_chapters" ADD COLUMN "body" jsonb;
  ALTER TABLE "_articles_v_version_chapters" ADD COLUMN "pull_quote" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_standfirst" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "policies" ADD COLUMN "title" varchar;
  ALTER TABLE "policies" ADD COLUMN "subtitle" varchar;
  ALTER TABLE "policies" ADD COLUMN "body" jsonb;
  ALTER TABLE "policies" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "policies" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_policies_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_policies_v" ADD COLUMN "version_subtitle" varchar;
  ALTER TABLE "_policies_v" ADD COLUMN "version_body" jsonb;
  ALTER TABLE "_policies_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_policies_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "products_attributes" ADD COLUMN "value" varchar;
  ALTER TABLE "products" ADD COLUMN "title" varchar;
  ALTER TABLE "products" ADD COLUMN "description" varchar;
  ALTER TABLE "products" ADD COLUMN "details" jsonb;
  ALTER TABLE "products" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_products_v_version_attributes" ADD COLUMN "value" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_description" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_details" jsonb;
  ALTER TABLE "_products_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "shop" ADD COLUMN "details_title" varchar DEFAULT 'PRODUCT DETAILS';
  ALTER TABLE "shop" ADD COLUMN "warranty_title" varchar DEFAULT '3 YEAR WARRANTY + FREE RETURNS';
  ALTER TABLE "shop" ADD COLUMN "delivery_title" varchar DEFAULT 'DELIVERY';
  ALTER TABLE "shop" ADD COLUMN "warranty" jsonb;
  ALTER TABLE "shop" ADD COLUMN "delivery" jsonb;
  ALTER TABLE "shop" ADD COLUMN "listing_subtitle" varchar;
  ALTER TABLE "contact_settings" ADD COLUMN "address" varchar DEFAULT '12 Market Street, Old Town, Example City';
  ALTER TABLE "contact_settings" ADD COLUMN "opening_hours" varchar DEFAULT 'Daily · 10:00 AM–9:00 PM';
  ALTER TABLE "contact_settings" ADD COLUMN "message_template" varchar DEFAULT 'Hello Aurum, I would like to order:
  
  {{items}}
  
  Total: {{total}}
  
  {{customer}}';
  ALTER TABLE "story_page_blocks_page_header" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "story_page_blocks_page_header" ADD COLUMN "heading" varchar;
  ALTER TABLE "story_page_blocks_page_header" ADD COLUMN "body" varchar;
  ALTER TABLE "story_page_blocks_closer_look_chips" ADD COLUMN "label" varchar;
  ALTER TABLE "story_page_blocks_closer_look_figures" ADD COLUMN "caption" varchar;
  ALTER TABLE "story_page_blocks_closer_look" ADD COLUMN "body" varchar;
  ALTER TABLE "story_page_blocks_banner" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "story_page_blocks_banner" ADD COLUMN "heading" varchar;
  ALTER TABLE "story_page_blocks_banner" ADD COLUMN "body" varchar;
  ALTER TABLE "story_page_blocks_banner" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD COLUMN "title" varchar;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD COLUMN "caption" varchar;
  ALTER TABLE "story_page_blocks_process_steps" ADD COLUMN "heading" varchar;
  ALTER TABLE "story_page_blocks_faq" ADD COLUMN "heading" varchar;
  ALTER TABLE "story_page_blocks_faq" ADD COLUMN "body" varchar;
  ALTER TABLE "story_page_blocks_faq" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "story_page" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "story_page" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD COLUMN "heading" varchar;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD COLUMN "body" varchar;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips" ADD COLUMN "label" varchar;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" ADD COLUMN "caption" varchar;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD COLUMN "body" varchar;
  ALTER TABLE "_story_page_v_blocks_banner" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_story_page_v_blocks_banner" ADD COLUMN "heading" varchar;
  ALTER TABLE "_story_page_v_blocks_banner" ADD COLUMN "body" varchar;
  ALTER TABLE "_story_page_v_blocks_banner" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD COLUMN "title" varchar;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD COLUMN "caption" varchar;
  ALTER TABLE "_story_page_v_blocks_process_steps" ADD COLUMN "heading" varchar;
  ALTER TABLE "_story_page_v_blocks_faq" ADD COLUMN "heading" varchar;
  ALTER TABLE "_story_page_v_blocks_faq" ADD COLUMN "body" varchar;
  ALTER TABLE "_story_page_v_blocks_faq" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "_story_page_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_story_page_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "blog_page" ADD COLUMN "eyebrow" varchar DEFAULT 'OUR BLOG';
  ALTER TABLE "blog_page" ADD COLUMN "heading" varchar DEFAULT 'Stories of diamonds, craftsmanship, and timeless beauty';
  ALTER TABLE "blog_page" ADD COLUMN "empty_title" varchar DEFAULT 'Nothing published yet';
  ALTER TABLE "blog_page" ADD COLUMN "empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.';
  ALTER TABLE "blog_page" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "blog_page" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_eyebrow" varchar DEFAULT 'OUR BLOG';
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_heading" varchar DEFAULT 'Stories of diamonds, craftsmanship, and timeless beauty';
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_empty_title" varchar DEFAULT 'Nothing published yet';
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.';
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_blog_page_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "contact_page" ADD COLUMN "eyebrow" varchar DEFAULT 'CONTACT US';
  ALTER TABLE "contact_page" ADD COLUMN "heading" varchar DEFAULT 'WE’RE HERE TO HELP';
  ALTER TABLE "contact_page" ADD COLUMN "intro" varchar DEFAULT 'Questions, custom requests, or styling advice — our team is here for you';
  ALTER TABLE "contact_page" ADD COLUMN "form_heading" varchar DEFAULT 'SEND US A MESSAGE';
  ALTER TABLE "contact_page" ADD COLUMN "form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.';
  ALTER TABLE "contact_page" ADD COLUMN "form_name_label" varchar DEFAULT 'Name';
  ALTER TABLE "contact_page" ADD COLUMN "form_email_label" varchar DEFAULT 'E-mail';
  ALTER TABLE "contact_page" ADD COLUMN "form_message_label" varchar DEFAULT 'Message';
  ALTER TABLE "contact_page" ADD COLUMN "form_submit_label" varchar DEFAULT 'SEND MESSAGE';
  ALTER TABLE "contact_page" ADD COLUMN "form_footnote" varchar DEFAULT 'We’ll get back to you as soon as possible.';
  ALTER TABLE "contact_page" ADD COLUMN "form_success_message" varchar DEFAULT 'Thank you — your message has reached us. We’ll be in touch as soon as we can.';
  ALTER TABLE "contact_page" ADD COLUMN "form_error_message" varchar DEFAULT 'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.';
  ALTER TABLE "contact_page" ADD COLUMN "faq_heading" varchar DEFAULT 'Frequently Asked Questions';
  ALTER TABLE "contact_page" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "contact_page" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_eyebrow" varchar DEFAULT 'CONTACT US';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_heading" varchar DEFAULT 'WE’RE HERE TO HELP';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_intro" varchar DEFAULT 'Questions, custom requests, or styling advice — our team is here for you';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_heading" varchar DEFAULT 'SEND US A MESSAGE';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_name_label" varchar DEFAULT 'Name';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_email_label" varchar DEFAULT 'E-mail';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_message_label" varchar DEFAULT 'Message';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_submit_label" varchar DEFAULT 'SEND MESSAGE';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_footnote" varchar DEFAULT 'We’ll get back to you as soon as possible.';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_success_message" varchar DEFAULT 'Thank you — your message has reached us. We’ll be in touch as soon as we can.';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_form_error_message" varchar DEFAULT 'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_faq_heading" varchar DEFAULT 'Frequently Asked Questions';
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_contact_page_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "faq_page" ADD COLUMN "heading" varchar DEFAULT 'Frequently Asked Questions';
  ALTER TABLE "faq_page" ADD COLUMN "empty_title" varchar DEFAULT 'Nothing here yet';
  ALTER TABLE "faq_page" ADD COLUMN "empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.';
  ALTER TABLE "faq_page" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "faq_page" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_faq_page_v" ADD COLUMN "version_heading" varchar DEFAULT 'Frequently Asked Questions';
  ALTER TABLE "_faq_page_v" ADD COLUMN "version_empty_title" varchar DEFAULT 'Nothing here yet';
  ALTER TABLE "_faq_page_v" ADD COLUMN "version_empty_description" varchar DEFAULT 'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.';
  ALTER TABLE "_faq_page_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_faq_page_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "cookie_settings_categories" ADD COLUMN "name" varchar;
  ALTER TABLE "cookie_settings_categories" ADD COLUMN "purpose" varchar;
  ALTER TABLE "cookie_settings" ADD COLUMN "banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb;
  ALTER TABLE "_cookie_settings_v_version_categories" ADD COLUMN "name" varchar;
  ALTER TABLE "_cookie_settings_v_version_categories" ADD COLUMN "purpose" varchar;
  ALTER TABLE "_cookie_settings_v" ADD COLUMN "version_banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb;
  ALTER TABLE "_questions_v" DROP COLUMN "snapshot";
  ALTER TABLE "_questions_v" DROP COLUMN "published_locale";
  ALTER TABLE "_articles_v" DROP COLUMN "snapshot";
  ALTER TABLE "_articles_v" DROP COLUMN "published_locale";
  ALTER TABLE "enquiries" DROP COLUMN "locale";
  ALTER TABLE "_policies_v" DROP COLUMN "snapshot";
  ALTER TABLE "_policies_v" DROP COLUMN "published_locale";
  ALTER TABLE "_variants_v" DROP COLUMN "snapshot";
  ALTER TABLE "_variants_v" DROP COLUMN "published_locale";
  ALTER TABLE "_products_v" DROP COLUMN "snapshot";
  ALTER TABLE "_products_v" DROP COLUMN "published_locale";
  ALTER TABLE "_story_page_v" DROP COLUMN "snapshot";
  ALTER TABLE "_story_page_v" DROP COLUMN "published_locale";
  ALTER TABLE "_blog_page_v" DROP COLUMN "snapshot";
  ALTER TABLE "_blog_page_v" DROP COLUMN "published_locale";
  ALTER TABLE "_contact_page_v" DROP COLUMN "snapshot";
  ALTER TABLE "_contact_page_v" DROP COLUMN "published_locale";
  ALTER TABLE "_faq_page_v" DROP COLUMN "snapshot";
  ALTER TABLE "_faq_page_v" DROP COLUMN "published_locale";
  ALTER TABLE "_cookie_settings_v" DROP COLUMN "snapshot";
  ALTER TABLE "_cookie_settings_v" DROP COLUMN "published_locale";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum__questions_v_published_locale";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum_enquiries_locale";
  DROP TYPE "public"."enum__policies_v_published_locale";
  DROP TYPE "public"."enum__variants_v_published_locale";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum__story_page_v_published_locale";
  DROP TYPE "public"."enum__blog_page_v_published_locale";
  DROP TYPE "public"."enum__contact_page_v_published_locale";
  DROP TYPE "public"."enum__faq_page_v_published_locale";
  DROP TYPE "public"."enum__cookie_settings_v_published_locale";`)

  /* The words go home, and the holding tables go away. */
  await db.execute(sql`
  UPDATE "media" AS p SET "alt" = c."alt" FROM "_carry_media" AS c WHERE c."_parent_id" = p."id";
  UPDATE "categories" AS p SET "title" = c."title", "subtitle" = c."subtitle", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_categories" AS c WHERE c."_parent_id" = p."id";
  UPDATE "collections" AS p SET "title" = c."title", "description" = c."description" FROM "_carry_collections" AS c WHERE c."_parent_id" = p."id";
  UPDATE "sizes" AS p SET "label" = c."label" FROM "_carry_sizes" AS c WHERE c."_parent_id" = p."id";
  UPDATE "attributes" AS p SET "label" = c."label" FROM "_carry_attributes" AS c WHERE c."_parent_id" = p."id";
  UPDATE "questions" AS p SET "question" = c."question", "answer" = c."answer" FROM "_carry_questions" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_questions_v" AS p SET "version_question" = c."version_question", "version_answer" = c."version_answer" FROM "_carry__questions_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "article_categories" AS p SET "title" = c."title" FROM "_carry_article_categories" AS c WHERE c."_parent_id" = p."id";
  UPDATE "articles_chapters" AS p SET "heading" = c."heading", "toc_label" = c."toc_label", "lede" = c."lede", "body" = c."body", "pull_quote" = c."pull_quote" FROM "_carry_articles_chapters" AS c WHERE c."_parent_id" = p."id";
  UPDATE "articles" AS p SET "title" = c."title", "standfirst" = c."standfirst", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_articles" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_articles_v_version_chapters" AS p SET "heading" = c."heading", "toc_label" = c."toc_label", "lede" = c."lede", "body" = c."body", "pull_quote" = c."pull_quote" FROM "_carry__articles_v_version_chapters" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_articles_v" AS p SET "version_title" = c."version_title", "version_standfirst" = c."version_standfirst", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__articles_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "policies" AS p SET "title" = c."title", "subtitle" = c."subtitle", "body" = c."body", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_policies" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_policies_v" AS p SET "version_title" = c."version_title", "version_subtitle" = c."version_subtitle", "version_body" = c."version_body", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__policies_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "products_attributes" AS p SET "value" = c."value" FROM "_carry_products_attributes" AS c WHERE c."_parent_id" = p."id";
  UPDATE "products" AS p SET "title" = c."title", "description" = c."description", "details" = c."details", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_products" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_products_v_version_attributes" AS p SET "value" = c."value" FROM "_carry__products_v_version_attributes" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_products_v" AS p SET "version_title" = c."version_title", "version_description" = c."version_description", "version_details" = c."version_details", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__products_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "shop" AS p SET "details_title" = c."details_title", "warranty_title" = c."warranty_title", "delivery_title" = c."delivery_title", "warranty" = c."warranty", "delivery" = c."delivery", "listing_subtitle" = c."listing_subtitle" FROM "_carry_shop" AS c WHERE c."_parent_id" = p."id";
  UPDATE "contact_settings" AS p SET "address" = c."address", "opening_hours" = c."opening_hours", "message_template" = c."message_template" FROM "_carry_contact_settings" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_page_header" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "body" = c."body" FROM "_carry_story_page_blocks_page_header" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_closer_look_chips" AS p SET "label" = c."label" FROM "_carry_story_page_blocks_closer_look_chips" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_closer_look_figures" AS p SET "caption" = c."caption" FROM "_carry_story_page_blocks_closer_look_figures" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_closer_look" AS p SET "body" = c."body" FROM "_carry_story_page_blocks_closer_look" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_banner" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "body" = c."body", "cta_label" = c."cta_label" FROM "_carry_story_page_blocks_banner" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_process_steps_steps" AS p SET "title" = c."title", "caption" = c."caption" FROM "_carry_story_page_blocks_process_steps_steps" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_process_steps" AS p SET "heading" = c."heading" FROM "_carry_story_page_blocks_process_steps" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page_blocks_faq" AS p SET "heading" = c."heading", "body" = c."body", "cta_label" = c."cta_label" FROM "_carry_story_page_blocks_faq" AS c WHERE c."_parent_id" = p."id";
  UPDATE "story_page" AS p SET "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_story_page" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_page_header" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "body" = c."body" FROM "_carry__story_page_v_blocks_page_header" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_closer_look_chips" AS p SET "label" = c."label" FROM "_carry__story_page_v_blocks_closer_look_chips" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_closer_look_figures" AS p SET "caption" = c."caption" FROM "_carry__story_page_v_blocks_closer_look_figures" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_closer_look" AS p SET "body" = c."body" FROM "_carry__story_page_v_blocks_closer_look" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_banner" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "body" = c."body", "cta_label" = c."cta_label" FROM "_carry__story_page_v_blocks_banner" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_process_steps_steps" AS p SET "title" = c."title", "caption" = c."caption" FROM "_carry__story_page_v_blocks_process_steps_steps" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_process_steps" AS p SET "heading" = c."heading" FROM "_carry__story_page_v_blocks_process_steps" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v_blocks_faq" AS p SET "heading" = c."heading", "body" = c."body", "cta_label" = c."cta_label" FROM "_carry__story_page_v_blocks_faq" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_story_page_v" AS p SET "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__story_page_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "blog_page" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "empty_title" = c."empty_title", "empty_description" = c."empty_description", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_blog_page" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_blog_page_v" AS p SET "version_eyebrow" = c."version_eyebrow", "version_heading" = c."version_heading", "version_empty_title" = c."version_empty_title", "version_empty_description" = c."version_empty_description", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__blog_page_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "contact_page" AS p SET "eyebrow" = c."eyebrow", "heading" = c."heading", "intro" = c."intro", "form_heading" = c."form_heading", "form_body" = c."form_body", "form_name_label" = c."form_name_label", "form_email_label" = c."form_email_label", "form_message_label" = c."form_message_label", "form_submit_label" = c."form_submit_label", "form_footnote" = c."form_footnote", "form_success_message" = c."form_success_message", "form_error_message" = c."form_error_message", "faq_heading" = c."faq_heading", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_contact_page" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_contact_page_v" AS p SET "version_eyebrow" = c."version_eyebrow", "version_heading" = c."version_heading", "version_intro" = c."version_intro", "version_form_heading" = c."version_form_heading", "version_form_body" = c."version_form_body", "version_form_name_label" = c."version_form_name_label", "version_form_email_label" = c."version_form_email_label", "version_form_message_label" = c."version_form_message_label", "version_form_submit_label" = c."version_form_submit_label", "version_form_footnote" = c."version_form_footnote", "version_form_success_message" = c."version_form_success_message", "version_form_error_message" = c."version_form_error_message", "version_faq_heading" = c."version_faq_heading", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__contact_page_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "faq_page" AS p SET "heading" = c."heading", "empty_title" = c."empty_title", "empty_description" = c."empty_description", "seo_title" = c."seo_title", "seo_description" = c."seo_description" FROM "_carry_faq_page" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_faq_page_v" AS p SET "version_heading" = c."version_heading", "version_empty_title" = c."version_empty_title", "version_empty_description" = c."version_empty_description", "version_seo_title" = c."version_seo_title", "version_seo_description" = c."version_seo_description" FROM "_carry__faq_page_v" AS c WHERE c."_parent_id" = p."id";
  UPDATE "cookie_settings_categories" AS p SET "name" = c."name", "purpose" = c."purpose" FROM "_carry_cookie_settings_categories" AS c WHERE c."_parent_id" = p."id";
  UPDATE "cookie_settings" AS p SET "banner_body" = c."banner_body" FROM "_carry_cookie_settings" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_cookie_settings_v_version_categories" AS p SET "name" = c."name", "purpose" = c."purpose" FROM "_carry__cookie_settings_v_version_categories" AS c WHERE c."_parent_id" = p."id";
  UPDATE "_cookie_settings_v" AS p SET "version_banner_body" = c."version_banner_body" FROM "_carry__cookie_settings_v" AS c WHERE c."_parent_id" = p."id";
  DROP TABLE "_carry_media";
  DROP TABLE "_carry_categories";
  DROP TABLE "_carry_collections";
  DROP TABLE "_carry_sizes";
  DROP TABLE "_carry_attributes";
  DROP TABLE "_carry_questions";
  DROP TABLE "_carry__questions_v";
  DROP TABLE "_carry_article_categories";
  DROP TABLE "_carry_articles_chapters";
  DROP TABLE "_carry_articles";
  DROP TABLE "_carry__articles_v_version_chapters";
  DROP TABLE "_carry__articles_v";
  DROP TABLE "_carry_policies";
  DROP TABLE "_carry__policies_v";
  DROP TABLE "_carry_products_attributes";
  DROP TABLE "_carry_products";
  DROP TABLE "_carry__products_v_version_attributes";
  DROP TABLE "_carry__products_v";
  DROP TABLE "_carry_shop";
  DROP TABLE "_carry_contact_settings";
  DROP TABLE "_carry_story_page_blocks_page_header";
  DROP TABLE "_carry_story_page_blocks_closer_look_chips";
  DROP TABLE "_carry_story_page_blocks_closer_look_figures";
  DROP TABLE "_carry_story_page_blocks_closer_look";
  DROP TABLE "_carry_story_page_blocks_banner";
  DROP TABLE "_carry_story_page_blocks_process_steps_steps";
  DROP TABLE "_carry_story_page_blocks_process_steps";
  DROP TABLE "_carry_story_page_blocks_faq";
  DROP TABLE "_carry_story_page";
  DROP TABLE "_carry__story_page_v_blocks_page_header";
  DROP TABLE "_carry__story_page_v_blocks_closer_look_chips";
  DROP TABLE "_carry__story_page_v_blocks_closer_look_figures";
  DROP TABLE "_carry__story_page_v_blocks_closer_look";
  DROP TABLE "_carry__story_page_v_blocks_banner";
  DROP TABLE "_carry__story_page_v_blocks_process_steps_steps";
  DROP TABLE "_carry__story_page_v_blocks_process_steps";
  DROP TABLE "_carry__story_page_v_blocks_faq";
  DROP TABLE "_carry__story_page_v";
  DROP TABLE "_carry_blog_page";
  DROP TABLE "_carry__blog_page_v";
  DROP TABLE "_carry_contact_page";
  DROP TABLE "_carry__contact_page_v";
  DROP TABLE "_carry_faq_page";
  DROP TABLE "_carry__faq_page_v";
  DROP TABLE "_carry_cookie_settings_categories";
  DROP TABLE "_carry_cookie_settings";
  DROP TABLE "_carry__cookie_settings_v_version_categories";
  DROP TABLE "_carry__cookie_settings_v";`)

  /*
    **The columns went back nullable, and this is where they stop being nullable.**

    A `NOT NULL` column cannot be added to a table that already has rows — `column "alt" of relation
    "media" contains null values` is what the first rehearsal of this rollback actually said. The
    generated statements were therefore relaxed to nullable, the words above have since been put
    back, and the constraint is restored here so the rolled-back schema is byte-for-byte the one
    this migration started from.
  */
  await db.execute(sql`
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "categories" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "collections" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "sizes" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "attributes" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "article_categories" ALTER COLUMN "title" SET NOT NULL;`)

}
