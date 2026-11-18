import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_customers_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_customers_marketing_email_source" AS ENUM('registration', 'profile');
  CREATE TYPE "public"."enum_attributes_type" AS ENUM('text', 'number', 'select');
  CREATE TYPE "public"."enum_verification_codes_purpose" AS ENUM('verify-email', 'reset-password');
  CREATE TYPE "public"."enum_questions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__questions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__questions_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_articles_hero_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_hero_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_enquiries_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_enquiries_notification" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_policies_footer_placement" AS ENUM('legal', 'customer-care', 'hidden');
  CREATE TYPE "public"."enum_policies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__policies_v_version_footer_placement" AS ENUM('legal', 'customer-care', 'hidden');
  CREATE TYPE "public"."enum__policies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__policies_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_addresses_country" AS ENUM('AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV', 'BR', 'IO', 'VG', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'BQ', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'KP', 'MK', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'KR', 'SS', 'ES', 'LK', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UM', 'VI', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'WF', 'EH', 'YE', 'ZM', 'ZW');
  CREATE TYPE "public"."enum_variants_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__variants_v_version_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum__variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__variants_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_products_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_carts_currency" AS ENUM('USD');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'purgeAccounts', 'expireCarts', 'purgeEnquiries');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'purgeAccounts', 'expireCarts', 'purgeEnquiries');
  CREATE TYPE "public"."enum_account_settings_shipping_countries" AS ENUM('AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV', 'BR', 'IO', 'VG', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'BQ', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'KP', 'MK', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'KR', 'SS', 'ES', 'LK', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UM', 'VI', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'WF', 'EH', 'YE', 'ZM', 'ZW');
  CREATE TYPE "public"."enum_account_settings_default_country" AS ENUM('AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV', 'BR', 'IO', 'VG', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'BQ', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'KP', 'MK', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'KR', 'SS', 'ES', 'LK', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UM', 'VI', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'WF', 'EH', 'YE', 'ZM', 'ZW');
  CREATE TYPE "public"."enum_contact_settings_messengers_platform" AS ENUM('instagram', 'telegram', 'whatsapp');
  CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
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
  CREATE TYPE "public"."enum__story_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_blog_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_contact_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_faq_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_page_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TYPE "public"."enum_cookie_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cookie_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cookie_settings_v_published_locale" AS ENUM('en', 'ru', 'uk');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"name" varchar,
  	"locale" "enum_customers_locale" DEFAULT 'en',
  	"marketing_email" boolean DEFAULT false,
  	"marketing_email_updated_at" timestamp(3) with time zone,
  	"marketing_email_source" "enum_customers_marketing_email_source",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_sm_url" varchar,
  	"sizes_sm_width" numeric,
  	"sizes_sm_height" numeric,
  	"sizes_sm_mime_type" varchar,
  	"sizes_sm_filesize" numeric,
  	"sizes_sm_filename" varchar,
  	"sizes_md_url" varchar,
  	"sizes_md_width" numeric,
  	"sizes_md_height" numeric,
  	"sizes_md_mime_type" varchar,
  	"sizes_md_filesize" numeric,
  	"sizes_md_filename" varchar,
  	"sizes_lg_url" varchar,
  	"sizes_lg_width" numeric,
  	"sizes_lg_height" numeric,
  	"sizes_lg_mime_type" varchar,
  	"sizes_lg_filesize" numeric,
  	"sizes_lg_filename" varchar,
  	"sizes_xl_url" varchar,
  	"sizes_xl_width" numeric,
  	"sizes_xl_height" numeric,
  	"sizes_xl_mime_type" varchar,
  	"sizes_xl_filesize" numeric,
  	"sizes_xl_filename" varchar,
  	"sizes_full_url" varchar,
  	"sizes_full_width" numeric,
  	"sizes_full_height" numeric,
  	"sizes_full_mime_type" varchar,
  	"sizes_full_filesize" numeric,
  	"sizes_full_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "collections_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
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
  
  CREATE TABLE "attributes_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_attributes_type" DEFAULT 'text' NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "verification_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"customer_id" integer,
  	"purpose" "enum_verification_codes_purpose" NOT NULL,
  	"code_hash" varchar NOT NULL,
  	"token" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"consumed_at" timestamp(3) with time zone,
  	"superseded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_questions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "questions_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_questions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__questions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__questions_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_questions_v_locales" (
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "article_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "article_categories_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
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
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"published_on" timestamp(3) with time zone,
  	"category_id" integer,
  	"hero_kind" "enum_articles_hero_kind" DEFAULT 'photo',
  	"hero_photo_id" integer,
  	"hero_video_id" integer,
  	"hero_poster_id" integer,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
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
  
  CREATE TABLE "_articles_v_version_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
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
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_published_on" timestamp(3) with time zone,
  	"version_category_id" integer,
  	"version_hero_kind" "enum__articles_v_version_hero_kind" DEFAULT 'photo',
  	"version_hero_photo_id" integer,
  	"version_hero_video_id" integer,
  	"version_hero_poster_id" integer,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean
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
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"locale" "enum_enquiries_locale" DEFAULT 'en' NOT NULL,
  	"notification" "enum_enquiries_notification" DEFAULT 'pending' NOT NULL,
  	"notification_error" varchar,
  	"sender_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "policies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"effective_date" timestamp(3) with time zone,
  	"footer_placement" "enum_policies_footer_placement" DEFAULT 'legal',
  	"footer_order" numeric DEFAULT 0,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_policies_status" DEFAULT 'draft'
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
  
  CREATE TABLE "_policies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_effective_date" timestamp(3) with time zone,
  	"version_footer_placement" "enum__policies_v_version_footer_placement" DEFAULT 'legal',
  	"version_footer_order" numeric DEFAULT 0,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__policies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__policies_v_published_locale",
  	"latest" boolean
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
  
  CREATE TABLE "addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"title" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"company" varchar,
  	"address_line1" varchar NOT NULL,
  	"address_line2" varchar,
  	"apartment" varchar,
  	"city" varchar NOT NULL,
  	"state" varchar,
  	"postal_code" varchar NOT NULL,
  	"country" "enum_addresses_country" NOT NULL,
  	"phone" varchar,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  
  CREATE TABLE "variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"product_id" integer,
  	"inventory" numeric DEFAULT 0,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
  	"availability" "enum_variants_availability",
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" integer
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
  
  CREATE TABLE "_variants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_product_id" integer,
  	"version_inventory" numeric DEFAULT 0,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_availability" "enum__variants_v_version_availability",
  	"version_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__variants_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_variants_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" integer
  );
  
  CREATE TABLE "variant_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "variant_options" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_variantoptions_options_order" varchar,
  	"variant_type_id" integer NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "products_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer
  );
  
  CREATE TABLE "products_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"availability" "enum_products_availability" DEFAULT 'made-to-order',
  	"inventory" numeric DEFAULT 0,
  	"category_id" integer,
  	"enable_variants" boolean,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_products_status" DEFAULT 'draft'
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
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"collections_id" integer,
  	"colours_id" integer,
  	"variant_types_id" integer
  );
  
  CREATE TABLE "_products_v_version_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_attributes_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_availability" "enum__products_v_version_availability" DEFAULT 'made-to-order',
  	"version_inventory" numeric DEFAULT 0,
  	"version_category_id" integer,
  	"version_enable_variants" boolean,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__products_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
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
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"collections_id" integer,
  	"colours_id" integer,
  	"variant_types_id" integer
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"secret" varchar,
  	"customer_id" integer,
  	"purchased_at" timestamp(3) with time zone,
  	"subtotal" numeric,
  	"currency" "enum_carts_currency" DEFAULT 'USD',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"customers_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"collections_id" integer,
  	"colours_id" integer,
  	"attributes_id" integer,
  	"verification_codes_id" integer,
  	"questions_id" integer,
  	"article_categories_id" integer,
  	"articles_id" integer,
  	"enquiries_id" integer,
  	"policies_id" integer,
  	"addresses_id" integer,
  	"variants_id" integer,
  	"variant_types_id" integer,
  	"variant_options_id" integer,
  	"products_id" integer,
  	"carts_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"customers_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shop" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "shop_locales" (
  	"details_title" varchar DEFAULT 'PRODUCT DETAILS',
  	"warranty_title" varchar DEFAULT 'WARRANTY AND RETURNS',
  	"delivery_title" varchar DEFAULT 'DELIVERY',
  	"warranty" jsonb,
  	"delivery" jsonb,
  	"listing_subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "account_settings_shipping_countries" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_account_settings_shipping_countries",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "account_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"default_country" "enum_account_settings_default_country" DEFAULT 'AE' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_settings_messengers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_contact_settings_messengers_platform" NOT NULL,
  	"destination" varchar NOT NULL,
  	"handle" varchar NOT NULL,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "contact_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar DEFAULT 'hello@aurum.example',
  	"enquiry_email" varchar,
  	"phone" varchar DEFAULT '+1 (555) 010 20-30',
  	"maps_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_settings_locales" (
  	"address" varchar DEFAULT '12 Market Street, Old Town, Example City',
  	"opening_hours" varchar DEFAULT 'Daily · 10:00 AM–9:00 PM',
  	"message_template" varchar DEFAULT 'Hello, I would like to order:
  
  {{items}}
  
  Total: {{total}}
  
  {{customer}}',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
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
  	"hero_headline" varchar DEFAULT 'A headline about your store',
  	"hero_lede" varchar DEFAULT 'A short sentence under the headline that says what your store offers.',
  	"hero_cta_label" varchar DEFAULT 'Shop now',
  	"categories_heading" varchar DEFAULT 'Shop by category',
  	"featured_heading" varchar DEFAULT 'All products',
  	"featured_cta_label" varchar DEFAULT 'View all',
  	"about_heading_lead" varchar DEFAULT 'About',
  	"about_heading_emphasis" varchar DEFAULT 'us',
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
  	"version_hero_headline" varchar DEFAULT 'A headline about your store',
  	"version_hero_lede" varchar DEFAULT 'A short sentence under the headline that says what your store offers.',
  	"version_hero_cta_label" varchar DEFAULT 'Shop now',
  	"version_categories_heading" varchar DEFAULT 'Shop by category',
  	"version_featured_heading" varchar DEFAULT 'All products',
  	"version_featured_cta_label" varchar DEFAULT 'View all',
  	"version_about_heading_lead" varchar DEFAULT 'About',
  	"version_about_heading_emphasis" varchar DEFAULT 'us',
  	"version_about_cta_label" varchar DEFAULT 'Discover our story',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_page_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_page_header_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
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
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look_figures_locales" (
  	"word" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_closer_look" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_kind" "enum_story_page_blocks_closer_look_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_closer_look_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cta_href" varchar,
  	"media_kind" "enum_story_page_blocks_banner_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"text_side" "enum_story_page_blocks_banner_text_side" DEFAULT 'left',
  	"block_name" varchar
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
  
  CREATE TABLE "story_page_blocks_process_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_kind" "enum_story_page_blocks_process_steps_steps_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer
  );
  
  CREATE TABLE "story_page_blocks_process_steps_steps_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_process_steps_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "story_page_blocks_faq_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "story_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"_status" "enum_story_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "story_page_locales" (
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
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
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_page_header_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
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
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_figures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_figures_locales" (
  	"word" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_kind" "enum__story_page_v_blocks_closer_look_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_closer_look_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_href" varchar,
  	"media_kind" "enum__story_page_v_blocks_banner_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"text_side" "enum__story_page_v_blocks_banner_text_side" DEFAULT 'left',
  	"_uuid" varchar,
  	"block_name" varchar
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
  
  CREATE TABLE "_story_page_v_blocks_process_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_kind" "enum__story_page_v_blocks_process_steps_steps_media_kind" DEFAULT 'photo',
  	"media_photo_id" integer,
  	"media_video_id" integer,
  	"media_poster_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps_steps_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_process_steps_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_story_page_v_blocks_faq_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version__status" "enum__story_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__story_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_story_page_v_locales" (
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_story_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "blog_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"_status" "enum_blog_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "blog_page_locales" (
  	"eyebrow" varchar DEFAULT 'OUR BLOG',
  	"heading" varchar DEFAULT 'A headline for your blog',
  	"empty_title" varchar DEFAULT 'Nothing published yet',
  	"empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_blog_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version__status" "enum__blog_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__blog_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_blog_page_v_locales" (
  	"version_eyebrow" varchar DEFAULT 'OUR BLOG',
  	"version_heading" varchar DEFAULT 'A headline for your blog',
  	"version_empty_title" varchar DEFAULT 'Nothing published yet',
  	"version_empty_description" varchar DEFAULT 'The first stories are being written. Check back soon.',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_photo_id" integer,
  	"seo_image_id" integer,
  	"_status" "enum_contact_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_page_locales" (
  	"eyebrow" varchar DEFAULT 'CONTACT US',
  	"heading" varchar DEFAULT 'WE’RE HERE TO HELP',
  	"intro" varchar DEFAULT 'A short line about how your team can help',
  	"form_heading" varchar DEFAULT 'SEND US A MESSAGE',
  	"form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our team will be happy to help with orders, delivery, or any other questions.',
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
  
  CREATE TABLE "contact_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "_contact_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_form_photo_id" integer,
  	"version_seo_image_id" integer,
  	"version__status" "enum__contact_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__contact_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_contact_page_v_locales" (
  	"version_eyebrow" varchar DEFAULT 'CONTACT US',
  	"version_heading" varchar DEFAULT 'WE’RE HERE TO HELP',
  	"version_intro" varchar DEFAULT 'A short line about how your team can help',
  	"version_form_heading" varchar DEFAULT 'SEND US A MESSAGE',
  	"version_form_body" varchar DEFAULT 'To make an enquiry, please use the contact form below. Our team will be happy to help with orders, delivery, or any other questions.',
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
  
  CREATE TABLE "_contact_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "faq_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"_status" "enum_faq_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
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
  
  CREATE TABLE "_faq_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version__status" "enum__faq_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__faq_page_v_published_locale",
  	"latest" boolean
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
  
  CREATE TABLE "cookie_settings_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"necessary" boolean DEFAULT false
  );
  
  CREATE TABLE "cookie_settings_categories_locales" (
  	"name" varchar,
  	"purpose" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
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
  
  CREATE TABLE "cookie_settings_locales" (
  	"banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_cookie_settings_v_version_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"necessary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cookie_settings_v_version_categories_locales" (
  	"name" varchar,
  	"purpose" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
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
  	"snapshot" boolean,
  	"published_locale" "enum__cookie_settings_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_cookie_settings_v_locales" (
  	"version_banner_body" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.","version":1}]}]}}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "language_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ru_enabled" boolean DEFAULT true,
  	"uk_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_locales" ADD CONSTRAINT "collections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "colours_locales" ADD CONSTRAINT "colours_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_options" ADD CONSTRAINT "attributes_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attributes_locales" ADD CONSTRAINT "attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "questions_locales" ADD CONSTRAINT "questions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_questions_v" ADD CONSTRAINT "_questions_v_parent_id_questions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_questions_v_locales" ADD CONSTRAINT "_questions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_questions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "article_categories_locales" ADD CONSTRAINT "article_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_chapters" ADD CONSTRAINT "articles_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_chapters_locales" ADD CONSTRAINT "articles_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_photo_id_media_id_fk" FOREIGN KEY ("hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_poster_id_media_id_fk" FOREIGN KEY ("hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_chapters" ADD CONSTRAINT "_articles_v_version_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_chapters_locales" ADD CONSTRAINT "_articles_v_version_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v_version_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_category_id_article_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_photo_id_media_id_fk" FOREIGN KEY ("version_hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_poster_id_media_id_fk" FOREIGN KEY ("version_hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policies" ADD CONSTRAINT "policies_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "policies_locales" ADD CONSTRAINT "policies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_policies_v" ADD CONSTRAINT "_policies_v_parent_id_policies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_policies_v" ADD CONSTRAINT "_policies_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_policies_v_locales" ADD CONSTRAINT "_policies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_policies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_attributes" ADD CONSTRAINT "variants_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_attributes" ADD CONSTRAINT "variants_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_attributes_locales" ADD CONSTRAINT "variants_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."variants_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes" ADD CONSTRAINT "_variants_v_version_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes" ADD CONSTRAINT "_variants_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_version_attributes_locales" ADD CONSTRAINT "_variants_v_version_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_variants_v_version_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_parent_id_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "public"."variant_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_attributes_locales" ADD CONSTRAINT "products_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes_locales" ADD CONSTRAINT "_products_v_version_attributes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verification_codes_fk" FOREIGN KEY ("verification_codes_id") REFERENCES "public"."verification_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_categories_fk" FOREIGN KEY ("article_categories_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_policies_fk" FOREIGN KEY ("policies_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_locales" ADD CONSTRAINT "shop_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "account_settings_shipping_countries" ADD CONSTRAINT "account_settings_shipping_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."account_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_settings_messengers" ADD CONSTRAINT "contact_settings_messengers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_settings_locales" ADD CONSTRAINT "contact_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "story_page_blocks_page_header" ADD CONSTRAINT "story_page_blocks_page_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_page_header_locales" ADD CONSTRAINT "story_page_blocks_page_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_page_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_media_plate" ADD CONSTRAINT "story_page_blocks_media_plate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_chips" ADD CONSTRAINT "story_page_blocks_closer_look_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_chips_locales" ADD CONSTRAINT "story_page_blocks_closer_look_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_figures" ADD CONSTRAINT "story_page_blocks_closer_look_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_figures_locales" ADD CONSTRAINT "story_page_blocks_closer_look_figures_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look" ADD CONSTRAINT "story_page_blocks_closer_look_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_closer_look_locales" ADD CONSTRAINT "story_page_blocks_closer_look_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner" ADD CONSTRAINT "story_page_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_banner_locales" ADD CONSTRAINT "story_page_blocks_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps" ADD CONSTRAINT "story_page_blocks_process_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_steps_locales" ADD CONSTRAINT "story_page_blocks_process_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps" ADD CONSTRAINT "story_page_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_process_steps_locales" ADD CONSTRAINT "story_page_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_faq" ADD CONSTRAINT "story_page_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_blocks_faq_locales" ADD CONSTRAINT "story_page_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page" ADD CONSTRAINT "story_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "story_page_locales" ADD CONSTRAINT "story_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_rels" ADD CONSTRAINT "story_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."story_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "story_page_rels" ADD CONSTRAINT "story_page_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_page_header" ADD CONSTRAINT "_story_page_v_blocks_page_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_page_header_locales" ADD CONSTRAINT "_story_page_v_blocks_page_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_page_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_media_plate" ADD CONSTRAINT "_story_page_v_blocks_media_plate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips" ADD CONSTRAINT "_story_page_v_blocks_closer_look_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_chips_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures" ADD CONSTRAINT "_story_page_v_blocks_closer_look_figures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_figures_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_figures_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look_figures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look" ADD CONSTRAINT "_story_page_v_blocks_closer_look_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_closer_look_locales" ADD CONSTRAINT "_story_page_v_blocks_closer_look_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_closer_look"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner" ADD CONSTRAINT "_story_page_v_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_banner_locales" ADD CONSTRAINT "_story_page_v_blocks_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_photo_id_media_id_fk" FOREIGN KEY ("media_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_video_id_media_id_fk" FOREIGN KEY ("media_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_media_poster_id_media_id_fk" FOREIGN KEY ("media_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_steps_locales" ADD CONSTRAINT "_story_page_v_blocks_process_steps_steps_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps" ADD CONSTRAINT "_story_page_v_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_process_steps_locales" ADD CONSTRAINT "_story_page_v_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_faq" ADD CONSTRAINT "_story_page_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_blocks_faq_locales" ADD CONSTRAINT "_story_page_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v" ADD CONSTRAINT "_story_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_story_page_v_locales" ADD CONSTRAINT "_story_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_rels" ADD CONSTRAINT "_story_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_story_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_story_page_v_rels" ADD CONSTRAINT "_story_page_v_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_page" ADD CONSTRAINT "blog_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_page_locales" ADD CONSTRAINT "blog_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_page_v" ADD CONSTRAINT "_blog_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_page_v_locales" ADD CONSTRAINT "_blog_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page" ADD CONSTRAINT "contact_page_form_photo_id_media_id_fk" FOREIGN KEY ("form_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_page" ADD CONSTRAINT "contact_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_page_locales" ADD CONSTRAINT "contact_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page_rels" ADD CONSTRAINT "contact_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contact_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page_rels" ADD CONSTRAINT "contact_page_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v" ADD CONSTRAINT "_contact_page_v_version_form_photo_id_media_id_fk" FOREIGN KEY ("version_form_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contact_page_v" ADD CONSTRAINT "_contact_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contact_page_v_locales" ADD CONSTRAINT "_contact_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v_rels" ADD CONSTRAINT "_contact_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_contact_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v_rels" ADD CONSTRAINT "_contact_page_v_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_page" ADD CONSTRAINT "faq_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faq_page_locales" ADD CONSTRAINT "faq_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_page_v" ADD CONSTRAINT "_faq_page_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faq_page_v_locales" ADD CONSTRAINT "_faq_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings_categories" ADD CONSTRAINT "cookie_settings_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings_categories_locales" ADD CONSTRAINT "cookie_settings_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cookie_settings" ADD CONSTRAINT "cookie_settings_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cookie_settings_locales" ADD CONSTRAINT "cookie_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cookie_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_version_categories" ADD CONSTRAINT "_cookie_settings_v_version_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_version_categories_locales" ADD CONSTRAINT "_cookie_settings_v_version_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v_version_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v" ADD CONSTRAINT "_cookie_settings_v_version_policy_id_policies_id_fk" FOREIGN KEY ("version_policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cookie_settings_v_locales" ADD CONSTRAINT "_cookie_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cookie_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_sm_sizes_sm_filename_idx" ON "media" USING btree ("sizes_sm_filename");
  CREATE INDEX "media_sizes_md_sizes_md_filename_idx" ON "media" USING btree ("sizes_md_filename");
  CREATE INDEX "media_sizes_lg_sizes_lg_filename_idx" ON "media" USING btree ("sizes_lg_filename");
  CREATE INDEX "media_sizes_xl_sizes_xl_filename_idx" ON "media" USING btree ("sizes_xl_filename");
  CREATE INDEX "media_sizes_full_sizes_full_filename_idx" ON "media" USING btree ("sizes_full_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_seo_seo_image_idx" ON "categories" USING btree ("seo_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE UNIQUE INDEX "collections_locales_locale_parent_id_unique" ON "collections_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "colours_value_idx" ON "colours" USING btree ("value");
  CREATE INDEX "colours_updated_at_idx" ON "colours" USING btree ("updated_at");
  CREATE INDEX "colours_created_at_idx" ON "colours" USING btree ("created_at");
  CREATE UNIQUE INDEX "colours_locales_locale_parent_id_unique" ON "colours_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "attributes_options_order_idx" ON "attributes_options" USING btree ("_order");
  CREATE INDEX "attributes_options_parent_id_idx" ON "attributes_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "attributes_name_idx" ON "attributes" USING btree ("name");
  CREATE INDEX "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  CREATE INDEX "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
  CREATE UNIQUE INDEX "attributes_locales_locale_parent_id_unique" ON "attributes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "verification_codes_email_idx" ON "verification_codes" USING btree ("email");
  CREATE INDEX "verification_codes_customer_idx" ON "verification_codes" USING btree ("customer_id");
  CREATE INDEX "verification_codes_purpose_idx" ON "verification_codes" USING btree ("purpose");
  CREATE INDEX "verification_codes_expires_at_idx" ON "verification_codes" USING btree ("expires_at");
  CREATE INDEX "verification_codes_updated_at_idx" ON "verification_codes" USING btree ("updated_at");
  CREATE INDEX "verification_codes_created_at_idx" ON "verification_codes" USING btree ("created_at");
  CREATE INDEX "questions_updated_at_idx" ON "questions" USING btree ("updated_at");
  CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at");
  CREATE INDEX "questions__status_idx" ON "questions" USING btree ("_status");
  CREATE UNIQUE INDEX "questions_locales_locale_parent_id_unique" ON "questions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_questions_v_parent_idx" ON "_questions_v" USING btree ("parent_id");
  CREATE INDEX "_questions_v_version_version_updated_at_idx" ON "_questions_v" USING btree ("version_updated_at");
  CREATE INDEX "_questions_v_version_version_created_at_idx" ON "_questions_v" USING btree ("version_created_at");
  CREATE INDEX "_questions_v_version_version__status_idx" ON "_questions_v" USING btree ("version__status");
  CREATE INDEX "_questions_v_created_at_idx" ON "_questions_v" USING btree ("created_at");
  CREATE INDEX "_questions_v_updated_at_idx" ON "_questions_v" USING btree ("updated_at");
  CREATE INDEX "_questions_v_snapshot_idx" ON "_questions_v" USING btree ("snapshot");
  CREATE INDEX "_questions_v_published_locale_idx" ON "_questions_v" USING btree ("published_locale");
  CREATE INDEX "_questions_v_latest_idx" ON "_questions_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_questions_v_locales_locale_parent_id_unique" ON "_questions_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "article_categories_slug_idx" ON "article_categories" USING btree ("slug");
  CREATE INDEX "article_categories_updated_at_idx" ON "article_categories" USING btree ("updated_at");
  CREATE INDEX "article_categories_created_at_idx" ON "article_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "article_categories_locales_locale_parent_id_unique" ON "article_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_chapters_order_idx" ON "articles_chapters" USING btree ("_order");
  CREATE INDEX "articles_chapters_parent_id_idx" ON "articles_chapters" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_chapters_locales_locale_parent_id_unique" ON "articles_chapters_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");
  CREATE INDEX "articles_hero_hero_photo_idx" ON "articles" USING btree ("hero_photo_id");
  CREATE INDEX "articles_hero_hero_video_idx" ON "articles" USING btree ("hero_video_id");
  CREATE INDEX "articles_hero_hero_poster_idx" ON "articles" USING btree ("hero_poster_id");
  CREATE INDEX "articles_seo_seo_image_idx" ON "articles" USING btree ("seo_image_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_version_chapters_order_idx" ON "_articles_v_version_chapters" USING btree ("_order");
  CREATE INDEX "_articles_v_version_chapters_parent_id_idx" ON "_articles_v_version_chapters" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_articles_v_version_chapters_locales_locale_parent_id_unique" ON "_articles_v_version_chapters_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_category_idx" ON "_articles_v" USING btree ("version_category_id");
  CREATE INDEX "_articles_v_version_hero_version_hero_photo_idx" ON "_articles_v" USING btree ("version_hero_photo_id");
  CREATE INDEX "_articles_v_version_hero_version_hero_video_idx" ON "_articles_v" USING btree ("version_hero_video_id");
  CREATE INDEX "_articles_v_version_hero_version_hero_poster_idx" ON "_articles_v" USING btree ("version_hero_poster_id");
  CREATE INDEX "_articles_v_version_seo_version_seo_image_idx" ON "_articles_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "enquiries_email_idx" ON "enquiries" USING btree ("email");
  CREATE INDEX "enquiries_sender_hash_idx" ON "enquiries" USING btree ("sender_hash");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "policies_slug_idx" ON "policies" USING btree ("slug");
  CREATE INDEX "policies_seo_seo_image_idx" ON "policies" USING btree ("seo_image_id");
  CREATE INDEX "policies_updated_at_idx" ON "policies" USING btree ("updated_at");
  CREATE INDEX "policies_created_at_idx" ON "policies" USING btree ("created_at");
  CREATE INDEX "policies__status_idx" ON "policies" USING btree ("_status");
  CREATE UNIQUE INDEX "policies_locales_locale_parent_id_unique" ON "policies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_policies_v_parent_idx" ON "_policies_v" USING btree ("parent_id");
  CREATE INDEX "_policies_v_version_version_slug_idx" ON "_policies_v" USING btree ("version_slug");
  CREATE INDEX "_policies_v_version_seo_version_seo_image_idx" ON "_policies_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_policies_v_version_version_updated_at_idx" ON "_policies_v" USING btree ("version_updated_at");
  CREATE INDEX "_policies_v_version_version_created_at_idx" ON "_policies_v" USING btree ("version_created_at");
  CREATE INDEX "_policies_v_version_version__status_idx" ON "_policies_v" USING btree ("version__status");
  CREATE INDEX "_policies_v_created_at_idx" ON "_policies_v" USING btree ("created_at");
  CREATE INDEX "_policies_v_updated_at_idx" ON "_policies_v" USING btree ("updated_at");
  CREATE INDEX "_policies_v_snapshot_idx" ON "_policies_v" USING btree ("snapshot");
  CREATE INDEX "_policies_v_published_locale_idx" ON "_policies_v" USING btree ("published_locale");
  CREATE INDEX "_policies_v_latest_idx" ON "_policies_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_policies_v_locales_locale_parent_id_unique" ON "_policies_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  CREATE INDEX "variants_attributes_order_idx" ON "variants_attributes" USING btree ("_order");
  CREATE INDEX "variants_attributes_parent_id_idx" ON "variants_attributes" USING btree ("_parent_id");
  CREATE INDEX "variants_attributes_attribute_idx" ON "variants_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "variants_attributes_locales_locale_parent_id_unique" ON "variants_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");
  CREATE INDEX "variants_image_idx" ON "variants" USING btree ("image_id");
  CREATE INDEX "variants_updated_at_idx" ON "variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "variants" USING btree ("created_at");
  CREATE INDEX "variants_deleted_at_idx" ON "variants" USING btree ("deleted_at");
  CREATE INDEX "variants__status_idx" ON "variants" USING btree ("_status");
  CREATE INDEX "variants_rels_order_idx" ON "variants_rels" USING btree ("order");
  CREATE INDEX "variants_rels_parent_idx" ON "variants_rels" USING btree ("parent_id");
  CREATE INDEX "variants_rels_path_idx" ON "variants_rels" USING btree ("path");
  CREATE INDEX "variants_rels_variant_options_id_idx" ON "variants_rels" USING btree ("variant_options_id");
  CREATE INDEX "_variants_v_version_attributes_order_idx" ON "_variants_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_variants_v_version_attributes_parent_id_idx" ON "_variants_v_version_attributes" USING btree ("_parent_id");
  CREATE INDEX "_variants_v_version_attributes_attribute_idx" ON "_variants_v_version_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "_variants_v_version_attributes_locales_locale_parent_id_uniq" ON "_variants_v_version_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_variants_v_parent_idx" ON "_variants_v" USING btree ("parent_id");
  CREATE INDEX "_variants_v_version_version_product_idx" ON "_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_variants_v_version_version_image_idx" ON "_variants_v" USING btree ("version_image_id");
  CREATE INDEX "_variants_v_version_version_updated_at_idx" ON "_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_variants_v_version_version_created_at_idx" ON "_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_variants_v_version_version_deleted_at_idx" ON "_variants_v" USING btree ("version_deleted_at");
  CREATE INDEX "_variants_v_version_version__status_idx" ON "_variants_v" USING btree ("version__status");
  CREATE INDEX "_variants_v_created_at_idx" ON "_variants_v" USING btree ("created_at");
  CREATE INDEX "_variants_v_updated_at_idx" ON "_variants_v" USING btree ("updated_at");
  CREATE INDEX "_variants_v_snapshot_idx" ON "_variants_v" USING btree ("snapshot");
  CREATE INDEX "_variants_v_published_locale_idx" ON "_variants_v" USING btree ("published_locale");
  CREATE INDEX "_variants_v_latest_idx" ON "_variants_v" USING btree ("latest");
  CREATE INDEX "_variants_v_autosave_idx" ON "_variants_v" USING btree ("autosave");
  CREATE INDEX "_variants_v_rels_order_idx" ON "_variants_v_rels" USING btree ("order");
  CREATE INDEX "_variants_v_rels_parent_idx" ON "_variants_v_rels" USING btree ("parent_id");
  CREATE INDEX "_variants_v_rels_path_idx" ON "_variants_v_rels" USING btree ("path");
  CREATE INDEX "_variants_v_rels_variant_options_id_idx" ON "_variants_v_rels" USING btree ("variant_options_id");
  CREATE INDEX "variant_types_updated_at_idx" ON "variant_types" USING btree ("updated_at");
  CREATE INDEX "variant_types_created_at_idx" ON "variant_types" USING btree ("created_at");
  CREATE INDEX "variant_types_deleted_at_idx" ON "variant_types" USING btree ("deleted_at");
  CREATE INDEX "variant_options__variantoptions_options_order_idx" ON "variant_options" USING btree ("_variantoptions_options_order");
  CREATE INDEX "variant_options_variant_type_idx" ON "variant_options" USING btree ("variant_type_id");
  CREATE INDEX "variant_options_updated_at_idx" ON "variant_options" USING btree ("updated_at");
  CREATE INDEX "variant_options_created_at_idx" ON "variant_options" USING btree ("created_at");
  CREATE INDEX "variant_options_deleted_at_idx" ON "variant_options" USING btree ("deleted_at");
  CREATE INDEX "products_attributes_order_idx" ON "products_attributes" USING btree ("_order");
  CREATE INDEX "products_attributes_parent_id_idx" ON "products_attributes" USING btree ("_parent_id");
  CREATE INDEX "products_attributes_attribute_idx" ON "products_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "products_attributes_locales_locale_parent_id_unique" ON "products_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_availability_idx" ON "products" USING btree ("availability");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_seo_seo_image_idx" ON "products" USING btree ("seo_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_collections_id_idx" ON "products_rels" USING btree ("collections_id");
  CREATE INDEX "products_rels_colours_id_idx" ON "products_rels" USING btree ("colours_id");
  CREATE INDEX "products_rels_variant_types_id_idx" ON "products_rels" USING btree ("variant_types_id");
  CREATE INDEX "_products_v_version_attributes_order_idx" ON "_products_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_products_v_version_attributes_parent_id_idx" ON "_products_v_version_attributes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_attributes_attribute_idx" ON "_products_v_version_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "_products_v_version_attributes_locales_locale_parent_id_uniq" ON "_products_v_version_attributes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_availability_idx" ON "_products_v" USING btree ("version_availability");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_seo_version_seo_image_idx" ON "_products_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "_products_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_collections_id_idx" ON "_products_v_rels" USING btree ("collections_id");
  CREATE INDEX "_products_v_rels_colours_id_idx" ON "_products_v_rels" USING btree ("colours_id");
  CREATE INDEX "_products_v_rels_variant_types_id_idx" ON "_products_v_rels" USING btree ("variant_types_id");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_secret_idx" ON "carts" USING btree ("secret");
  CREATE INDEX "carts_customer_idx" ON "carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");
  CREATE INDEX "payload_locked_documents_rels_colours_id_idx" ON "payload_locked_documents_rels" USING btree ("colours_id");
  CREATE INDEX "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  CREATE INDEX "payload_locked_documents_rels_verification_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("verification_codes_id");
  CREATE INDEX "payload_locked_documents_rels_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("questions_id");
  CREATE INDEX "payload_locked_documents_rels_article_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("article_categories_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_policies_id_idx" ON "payload_locked_documents_rels" USING btree ("policies_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_variant_types_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_types_id");
  CREATE INDEX "payload_locked_documents_rels_variant_options_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_options_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "shop_locales_locale_parent_id_unique" ON "shop_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "account_settings_shipping_countries_order_idx" ON "account_settings_shipping_countries" USING btree ("order");
  CREATE INDEX "account_settings_shipping_countries_parent_idx" ON "account_settings_shipping_countries" USING btree ("parent_id");
  CREATE INDEX "contact_settings_messengers_order_idx" ON "contact_settings_messengers" USING btree ("_order");
  CREATE INDEX "contact_settings_messengers_parent_id_idx" ON "contact_settings_messengers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "contact_settings_locales_locale_parent_id_unique" ON "contact_settings_locales" USING btree ("_locale","_parent_id");
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
  CREATE UNIQUE INDEX "_home_page_v_locales_locale_parent_id_unique" ON "_home_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_page_header_order_idx" ON "story_page_blocks_page_header" USING btree ("_order");
  CREATE INDEX "story_page_blocks_page_header_parent_id_idx" ON "story_page_blocks_page_header" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_page_header_path_idx" ON "story_page_blocks_page_header" USING btree ("_path");
  CREATE UNIQUE INDEX "story_page_blocks_page_header_locales_locale_parent_id_uniqu" ON "story_page_blocks_page_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_media_plate_order_idx" ON "story_page_blocks_media_plate" USING btree ("_order");
  CREATE INDEX "story_page_blocks_media_plate_parent_id_idx" ON "story_page_blocks_media_plate" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_media_plate_path_idx" ON "story_page_blocks_media_plate" USING btree ("_path");
  CREATE INDEX "story_page_blocks_media_plate_media_media_photo_idx" ON "story_page_blocks_media_plate" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_media_plate_media_media_video_idx" ON "story_page_blocks_media_plate" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_media_plate_media_media_poster_idx" ON "story_page_blocks_media_plate" USING btree ("media_poster_id");
  CREATE INDEX "story_page_blocks_closer_look_chips_order_idx" ON "story_page_blocks_closer_look_chips" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_chips_parent_id_idx" ON "story_page_blocks_closer_look_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_chips_locales_locale_parent_id" ON "story_page_blocks_closer_look_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_figures_order_idx" ON "story_page_blocks_closer_look_figures" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_figures_parent_id_idx" ON "story_page_blocks_closer_look_figures" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_figures_locales_locale_parent_" ON "story_page_blocks_closer_look_figures_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_order_idx" ON "story_page_blocks_closer_look" USING btree ("_order");
  CREATE INDEX "story_page_blocks_closer_look_parent_id_idx" ON "story_page_blocks_closer_look" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_closer_look_path_idx" ON "story_page_blocks_closer_look" USING btree ("_path");
  CREATE INDEX "story_page_blocks_closer_look_media_media_photo_idx" ON "story_page_blocks_closer_look" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_closer_look_media_media_video_idx" ON "story_page_blocks_closer_look" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_closer_look_media_media_poster_idx" ON "story_page_blocks_closer_look" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "story_page_blocks_closer_look_locales_locale_parent_id_uniqu" ON "story_page_blocks_closer_look_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_banner_order_idx" ON "story_page_blocks_banner" USING btree ("_order");
  CREATE INDEX "story_page_blocks_banner_parent_id_idx" ON "story_page_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_banner_path_idx" ON "story_page_blocks_banner" USING btree ("_path");
  CREATE INDEX "story_page_blocks_banner_media_media_photo_idx" ON "story_page_blocks_banner" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_banner_media_media_video_idx" ON "story_page_blocks_banner" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_banner_media_media_poster_idx" ON "story_page_blocks_banner" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "story_page_blocks_banner_locales_locale_parent_id_unique" ON "story_page_blocks_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_order_idx" ON "story_page_blocks_process_steps_steps" USING btree ("_order");
  CREATE INDEX "story_page_blocks_process_steps_steps_parent_id_idx" ON "story_page_blocks_process_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_photo_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_photo_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_video_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_video_id");
  CREATE INDEX "story_page_blocks_process_steps_steps_media_media_poster_idx" ON "story_page_blocks_process_steps_steps" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "story_page_blocks_process_steps_steps_locales_locale_parent_" ON "story_page_blocks_process_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_order_idx" ON "story_page_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "story_page_blocks_process_steps_parent_id_idx" ON "story_page_blocks_process_steps" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_process_steps_path_idx" ON "story_page_blocks_process_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "story_page_blocks_process_steps_locales_locale_parent_id_uni" ON "story_page_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_blocks_faq_order_idx" ON "story_page_blocks_faq" USING btree ("_order");
  CREATE INDEX "story_page_blocks_faq_parent_id_idx" ON "story_page_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "story_page_blocks_faq_path_idx" ON "story_page_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "story_page_blocks_faq_locales_locale_parent_id_unique" ON "story_page_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_seo_seo_image_idx" ON "story_page" USING btree ("seo_image_id");
  CREATE INDEX "story_page__status_idx" ON "story_page" USING btree ("_status");
  CREATE UNIQUE INDEX "story_page_locales_locale_parent_id_unique" ON "story_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_page_rels_order_idx" ON "story_page_rels" USING btree ("order");
  CREATE INDEX "story_page_rels_parent_idx" ON "story_page_rels" USING btree ("parent_id");
  CREATE INDEX "story_page_rels_path_idx" ON "story_page_rels" USING btree ("path");
  CREATE INDEX "story_page_rels_questions_id_idx" ON "story_page_rels" USING btree ("questions_id");
  CREATE INDEX "_story_page_v_blocks_page_header_order_idx" ON "_story_page_v_blocks_page_header" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_page_header_parent_id_idx" ON "_story_page_v_blocks_page_header" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_page_header_path_idx" ON "_story_page_v_blocks_page_header" USING btree ("_path");
  CREATE UNIQUE INDEX "_story_page_v_blocks_page_header_locales_locale_parent_id_un" ON "_story_page_v_blocks_page_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_order_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_media_plate_parent_id_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_path_idx" ON "_story_page_v_blocks_media_plate" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_photo_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_video_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_media_plate_media_media_poster_idx" ON "_story_page_v_blocks_media_plate" USING btree ("media_poster_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_chips_order_idx" ON "_story_page_v_blocks_closer_look_chips" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_chips_parent_id_idx" ON "_story_page_v_blocks_closer_look_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_chips_locales_locale_parent" ON "_story_page_v_blocks_closer_look_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_figures_order_idx" ON "_story_page_v_blocks_closer_look_figures" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_figures_parent_id_idx" ON "_story_page_v_blocks_closer_look_figures" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_figures_locales_locale_pare" ON "_story_page_v_blocks_closer_look_figures_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_order_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_closer_look_parent_id_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_path_idx" ON "_story_page_v_blocks_closer_look" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_photo_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_video_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_closer_look_media_media_poster_idx" ON "_story_page_v_blocks_closer_look" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_closer_look_locales_locale_parent_id_un" ON "_story_page_v_blocks_closer_look_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_banner_order_idx" ON "_story_page_v_blocks_banner" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_banner_parent_id_idx" ON "_story_page_v_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_banner_path_idx" ON "_story_page_v_blocks_banner" USING btree ("_path");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_photo_idx" ON "_story_page_v_blocks_banner" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_video_idx" ON "_story_page_v_blocks_banner" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_banner_media_media_poster_idx" ON "_story_page_v_blocks_banner" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_banner_locales_locale_parent_id_unique" ON "_story_page_v_blocks_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_order_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_parent_id_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_pho_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_photo_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_vid_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_video_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_steps_media_media_pos_idx" ON "_story_page_v_blocks_process_steps_steps" USING btree ("media_poster_id");
  CREATE UNIQUE INDEX "_story_page_v_blocks_process_steps_steps_locales_locale_pare" ON "_story_page_v_blocks_process_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_order_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_process_steps_parent_id_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_process_steps_path_idx" ON "_story_page_v_blocks_process_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "_story_page_v_blocks_process_steps_locales_locale_parent_id_" ON "_story_page_v_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_blocks_faq_order_idx" ON "_story_page_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_story_page_v_blocks_faq_parent_id_idx" ON "_story_page_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_story_page_v_blocks_faq_path_idx" ON "_story_page_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_story_page_v_blocks_faq_locales_locale_parent_id_unique" ON "_story_page_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_version_seo_version_seo_image_idx" ON "_story_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_story_page_v_version_version__status_idx" ON "_story_page_v" USING btree ("version__status");
  CREATE INDEX "_story_page_v_created_at_idx" ON "_story_page_v" USING btree ("created_at");
  CREATE INDEX "_story_page_v_updated_at_idx" ON "_story_page_v" USING btree ("updated_at");
  CREATE INDEX "_story_page_v_snapshot_idx" ON "_story_page_v" USING btree ("snapshot");
  CREATE INDEX "_story_page_v_published_locale_idx" ON "_story_page_v" USING btree ("published_locale");
  CREATE INDEX "_story_page_v_latest_idx" ON "_story_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_story_page_v_locales_locale_parent_id_unique" ON "_story_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_story_page_v_rels_order_idx" ON "_story_page_v_rels" USING btree ("order");
  CREATE INDEX "_story_page_v_rels_parent_idx" ON "_story_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_story_page_v_rels_path_idx" ON "_story_page_v_rels" USING btree ("path");
  CREATE INDEX "_story_page_v_rels_questions_id_idx" ON "_story_page_v_rels" USING btree ("questions_id");
  CREATE INDEX "blog_page_seo_seo_image_idx" ON "blog_page" USING btree ("seo_image_id");
  CREATE INDEX "blog_page__status_idx" ON "blog_page" USING btree ("_status");
  CREATE UNIQUE INDEX "blog_page_locales_locale_parent_id_unique" ON "blog_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_blog_page_v_version_seo_version_seo_image_idx" ON "_blog_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_blog_page_v_version_version__status_idx" ON "_blog_page_v" USING btree ("version__status");
  CREATE INDEX "_blog_page_v_created_at_idx" ON "_blog_page_v" USING btree ("created_at");
  CREATE INDEX "_blog_page_v_updated_at_idx" ON "_blog_page_v" USING btree ("updated_at");
  CREATE INDEX "_blog_page_v_snapshot_idx" ON "_blog_page_v" USING btree ("snapshot");
  CREATE INDEX "_blog_page_v_published_locale_idx" ON "_blog_page_v" USING btree ("published_locale");
  CREATE INDEX "_blog_page_v_latest_idx" ON "_blog_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_blog_page_v_locales_locale_parent_id_unique" ON "_blog_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "contact_page_form_form_photo_idx" ON "contact_page" USING btree ("form_photo_id");
  CREATE INDEX "contact_page_seo_seo_image_idx" ON "contact_page" USING btree ("seo_image_id");
  CREATE INDEX "contact_page__status_idx" ON "contact_page" USING btree ("_status");
  CREATE UNIQUE INDEX "contact_page_locales_locale_parent_id_unique" ON "contact_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "contact_page_rels_order_idx" ON "contact_page_rels" USING btree ("order");
  CREATE INDEX "contact_page_rels_parent_idx" ON "contact_page_rels" USING btree ("parent_id");
  CREATE INDEX "contact_page_rels_path_idx" ON "contact_page_rels" USING btree ("path");
  CREATE INDEX "contact_page_rels_questions_id_idx" ON "contact_page_rels" USING btree ("questions_id");
  CREATE INDEX "_contact_page_v_version_form_version_form_photo_idx" ON "_contact_page_v" USING btree ("version_form_photo_id");
  CREATE INDEX "_contact_page_v_version_seo_version_seo_image_idx" ON "_contact_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_contact_page_v_version_version__status_idx" ON "_contact_page_v" USING btree ("version__status");
  CREATE INDEX "_contact_page_v_created_at_idx" ON "_contact_page_v" USING btree ("created_at");
  CREATE INDEX "_contact_page_v_updated_at_idx" ON "_contact_page_v" USING btree ("updated_at");
  CREATE INDEX "_contact_page_v_snapshot_idx" ON "_contact_page_v" USING btree ("snapshot");
  CREATE INDEX "_contact_page_v_published_locale_idx" ON "_contact_page_v" USING btree ("published_locale");
  CREATE INDEX "_contact_page_v_latest_idx" ON "_contact_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_contact_page_v_locales_locale_parent_id_unique" ON "_contact_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_contact_page_v_rels_order_idx" ON "_contact_page_v_rels" USING btree ("order");
  CREATE INDEX "_contact_page_v_rels_parent_idx" ON "_contact_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_contact_page_v_rels_path_idx" ON "_contact_page_v_rels" USING btree ("path");
  CREATE INDEX "_contact_page_v_rels_questions_id_idx" ON "_contact_page_v_rels" USING btree ("questions_id");
  CREATE INDEX "faq_page_seo_seo_image_idx" ON "faq_page" USING btree ("seo_image_id");
  CREATE INDEX "faq_page__status_idx" ON "faq_page" USING btree ("_status");
  CREATE UNIQUE INDEX "faq_page_locales_locale_parent_id_unique" ON "faq_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faq_page_v_version_seo_version_seo_image_idx" ON "_faq_page_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_faq_page_v_version_version__status_idx" ON "_faq_page_v" USING btree ("version__status");
  CREATE INDEX "_faq_page_v_created_at_idx" ON "_faq_page_v" USING btree ("created_at");
  CREATE INDEX "_faq_page_v_updated_at_idx" ON "_faq_page_v" USING btree ("updated_at");
  CREATE INDEX "_faq_page_v_snapshot_idx" ON "_faq_page_v" USING btree ("snapshot");
  CREATE INDEX "_faq_page_v_published_locale_idx" ON "_faq_page_v" USING btree ("published_locale");
  CREATE INDEX "_faq_page_v_latest_idx" ON "_faq_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_faq_page_v_locales_locale_parent_id_unique" ON "_faq_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cookie_settings_categories_order_idx" ON "cookie_settings_categories" USING btree ("_order");
  CREATE INDEX "cookie_settings_categories_parent_id_idx" ON "cookie_settings_categories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "cookie_settings_categories_locales_locale_parent_id_unique" ON "cookie_settings_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cookie_settings_policy_idx" ON "cookie_settings" USING btree ("policy_id");
  CREATE INDEX "cookie_settings__status_idx" ON "cookie_settings" USING btree ("_status");
  CREATE UNIQUE INDEX "cookie_settings_locales_locale_parent_id_unique" ON "cookie_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_cookie_settings_v_version_categories_order_idx" ON "_cookie_settings_v_version_categories" USING btree ("_order");
  CREATE INDEX "_cookie_settings_v_version_categories_parent_id_idx" ON "_cookie_settings_v_version_categories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_cookie_settings_v_version_categories_locales_locale_parent_" ON "_cookie_settings_v_version_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_cookie_settings_v_version_version_policy_idx" ON "_cookie_settings_v" USING btree ("version_policy_id");
  CREATE INDEX "_cookie_settings_v_version_version__status_idx" ON "_cookie_settings_v" USING btree ("version__status");
  CREATE INDEX "_cookie_settings_v_created_at_idx" ON "_cookie_settings_v" USING btree ("created_at");
  CREATE INDEX "_cookie_settings_v_updated_at_idx" ON "_cookie_settings_v" USING btree ("updated_at");
  CREATE INDEX "_cookie_settings_v_snapshot_idx" ON "_cookie_settings_v" USING btree ("snapshot");
  CREATE INDEX "_cookie_settings_v_published_locale_idx" ON "_cookie_settings_v" USING btree ("published_locale");
  CREATE INDEX "_cookie_settings_v_latest_idx" ON "_cookie_settings_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_cookie_settings_v_locales_locale_parent_id_unique" ON "_cookie_settings_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "collections" CASCADE;
  DROP TABLE "collections_locales" CASCADE;
  DROP TABLE "colours" CASCADE;
  DROP TABLE "colours_locales" CASCADE;
  DROP TABLE "attributes_options" CASCADE;
  DROP TABLE "attributes" CASCADE;
  DROP TABLE "attributes_locales" CASCADE;
  DROP TABLE "verification_codes" CASCADE;
  DROP TABLE "questions" CASCADE;
  DROP TABLE "questions_locales" CASCADE;
  DROP TABLE "_questions_v" CASCADE;
  DROP TABLE "_questions_v_locales" CASCADE;
  DROP TABLE "article_categories" CASCADE;
  DROP TABLE "article_categories_locales" CASCADE;
  DROP TABLE "articles_chapters" CASCADE;
  DROP TABLE "articles_chapters_locales" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "_articles_v_version_chapters" CASCADE;
  DROP TABLE "_articles_v_version_chapters_locales" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "policies" CASCADE;
  DROP TABLE "policies_locales" CASCADE;
  DROP TABLE "_policies_v" CASCADE;
  DROP TABLE "_policies_v_locales" CASCADE;
  DROP TABLE "addresses" CASCADE;
  DROP TABLE "variants_attributes" CASCADE;
  DROP TABLE "variants_attributes_locales" CASCADE;
  DROP TABLE "variants" CASCADE;
  DROP TABLE "variants_rels" CASCADE;
  DROP TABLE "_variants_v_version_attributes" CASCADE;
  DROP TABLE "_variants_v_version_attributes_locales" CASCADE;
  DROP TABLE "_variants_v" CASCADE;
  DROP TABLE "_variants_v_rels" CASCADE;
  DROP TABLE "variant_types" CASCADE;
  DROP TABLE "variant_options" CASCADE;
  DROP TABLE "products_attributes" CASCADE;
  DROP TABLE "products_attributes_locales" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_attributes" CASCADE;
  DROP TABLE "_products_v_version_attributes_locales" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "shop" CASCADE;
  DROP TABLE "shop_locales" CASCADE;
  DROP TABLE "account_settings_shipping_countries" CASCADE;
  DROP TABLE "account_settings" CASCADE;
  DROP TABLE "contact_settings_messengers" CASCADE;
  DROP TABLE "contact_settings" CASCADE;
  DROP TABLE "contact_settings_locales" CASCADE;
  DROP TABLE "home_page_about_body" CASCADE;
  DROP TABLE "home_page_about_body_locales" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "_home_page_v_version_about_body" CASCADE;
  DROP TABLE "_home_page_v_version_about_body_locales" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_locales" CASCADE;
  DROP TABLE "story_page_blocks_page_header" CASCADE;
  DROP TABLE "story_page_blocks_page_header_locales" CASCADE;
  DROP TABLE "story_page_blocks_media_plate" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_chips" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_chips_locales" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_figures" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_figures_locales" CASCADE;
  DROP TABLE "story_page_blocks_closer_look" CASCADE;
  DROP TABLE "story_page_blocks_closer_look_locales" CASCADE;
  DROP TABLE "story_page_blocks_banner" CASCADE;
  DROP TABLE "story_page_blocks_banner_locales" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_steps" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_steps_locales" CASCADE;
  DROP TABLE "story_page_blocks_process_steps" CASCADE;
  DROP TABLE "story_page_blocks_process_steps_locales" CASCADE;
  DROP TABLE "story_page_blocks_faq" CASCADE;
  DROP TABLE "story_page_blocks_faq_locales" CASCADE;
  DROP TABLE "story_page" CASCADE;
  DROP TABLE "story_page_locales" CASCADE;
  DROP TABLE "story_page_rels" CASCADE;
  DROP TABLE "_story_page_v_blocks_page_header" CASCADE;
  DROP TABLE "_story_page_v_blocks_page_header_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_media_plate" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_chips" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_chips_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_figures" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_figures_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look" CASCADE;
  DROP TABLE "_story_page_v_blocks_closer_look_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_banner" CASCADE;
  DROP TABLE "_story_page_v_blocks_banner_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_steps" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_steps_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps" CASCADE;
  DROP TABLE "_story_page_v_blocks_process_steps_locales" CASCADE;
  DROP TABLE "_story_page_v_blocks_faq" CASCADE;
  DROP TABLE "_story_page_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_story_page_v" CASCADE;
  DROP TABLE "_story_page_v_locales" CASCADE;
  DROP TABLE "_story_page_v_rels" CASCADE;
  DROP TABLE "blog_page" CASCADE;
  DROP TABLE "blog_page_locales" CASCADE;
  DROP TABLE "_blog_page_v" CASCADE;
  DROP TABLE "_blog_page_v_locales" CASCADE;
  DROP TABLE "contact_page" CASCADE;
  DROP TABLE "contact_page_locales" CASCADE;
  DROP TABLE "contact_page_rels" CASCADE;
  DROP TABLE "_contact_page_v" CASCADE;
  DROP TABLE "_contact_page_v_locales" CASCADE;
  DROP TABLE "_contact_page_v_rels" CASCADE;
  DROP TABLE "faq_page" CASCADE;
  DROP TABLE "faq_page_locales" CASCADE;
  DROP TABLE "_faq_page_v" CASCADE;
  DROP TABLE "_faq_page_v_locales" CASCADE;
  DROP TABLE "cookie_settings_categories" CASCADE;
  DROP TABLE "cookie_settings_categories_locales" CASCADE;
  DROP TABLE "cookie_settings" CASCADE;
  DROP TABLE "cookie_settings_locales" CASCADE;
  DROP TABLE "_cookie_settings_v_version_categories" CASCADE;
  DROP TABLE "_cookie_settings_v_version_categories_locales" CASCADE;
  DROP TABLE "_cookie_settings_v" CASCADE;
  DROP TABLE "_cookie_settings_v_locales" CASCADE;
  DROP TABLE "language_settings" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_customers_locale";
  DROP TYPE "public"."enum_customers_marketing_email_source";
  DROP TYPE "public"."enum_attributes_type";
  DROP TYPE "public"."enum_verification_codes_purpose";
  DROP TYPE "public"."enum_questions_status";
  DROP TYPE "public"."enum__questions_v_version_status";
  DROP TYPE "public"."enum__questions_v_published_locale";
  DROP TYPE "public"."enum_articles_hero_kind";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_hero_kind";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum_enquiries_locale";
  DROP TYPE "public"."enum_enquiries_notification";
  DROP TYPE "public"."enum_policies_footer_placement";
  DROP TYPE "public"."enum_policies_status";
  DROP TYPE "public"."enum__policies_v_version_footer_placement";
  DROP TYPE "public"."enum__policies_v_version_status";
  DROP TYPE "public"."enum__policies_v_published_locale";
  DROP TYPE "public"."enum_addresses_country";
  DROP TYPE "public"."enum_variants_availability";
  DROP TYPE "public"."enum_variants_status";
  DROP TYPE "public"."enum__variants_v_version_availability";
  DROP TYPE "public"."enum__variants_v_version_status";
  DROP TYPE "public"."enum__variants_v_published_locale";
  DROP TYPE "public"."enum_products_availability";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_availability";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum_carts_currency";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_account_settings_shipping_countries";
  DROP TYPE "public"."enum_account_settings_default_country";
  DROP TYPE "public"."enum_contact_settings_messengers_platform";
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum__home_page_v_published_locale";
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
  DROP TYPE "public"."enum__story_page_v_version_status";
  DROP TYPE "public"."enum__story_page_v_published_locale";
  DROP TYPE "public"."enum_blog_page_status";
  DROP TYPE "public"."enum__blog_page_v_version_status";
  DROP TYPE "public"."enum__blog_page_v_published_locale";
  DROP TYPE "public"."enum_contact_page_status";
  DROP TYPE "public"."enum__contact_page_v_version_status";
  DROP TYPE "public"."enum__contact_page_v_published_locale";
  DROP TYPE "public"."enum_faq_page_status";
  DROP TYPE "public"."enum__faq_page_v_version_status";
  DROP TYPE "public"."enum__faq_page_v_published_locale";
  DROP TYPE "public"."enum_cookie_settings_status";
  DROP TYPE "public"."enum__cookie_settings_v_version_status";
  DROP TYPE "public"."enum__cookie_settings_v_published_locale";`)
}
