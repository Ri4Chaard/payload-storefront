import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_attributes_type" AS ENUM('text', 'number', 'select');
  CREATE TYPE "public"."enum_addresses_country" AS ENUM('US', 'GB', 'CA', 'AU', 'AT', 'BE', 'BR', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HK', 'HU', 'IN', 'IE', 'IT', 'JP', 'LV', 'LT', 'LU', 'MY', 'MT', 'MX', 'NL', 'NZ', 'NO', 'PL', 'PT', 'RO', 'SG', 'SK', 'SI', 'ES', 'SE', 'CH');
  CREATE TYPE "public"."enum_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_products_colour" AS ENUM('black', 'clear', 'green', 'multicolor');
  CREATE TYPE "public"."enum_products_diamond_shape" AS ENUM('round', 'oval', 'emerald', 'pear', 'marquise', 'princess', 'baguette');
  CREATE TYPE "public"."enum_products_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_colour" AS ENUM('black', 'clear', 'green', 'multicolor');
  CREATE TYPE "public"."enum__products_v_version_diamond_shape" AS ENUM('round', 'oval', 'emerald', 'pear', 'marquise', 'princess', 'baguette');
  CREATE TYPE "public"."enum__products_v_version_availability" AS ENUM('made-to-order', 'stock-tracked');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_carts_currency" AS ENUM('USD');
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
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
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"subtitle" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sizes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"category_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_attributes_type" DEFAULT 'text' NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"title" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"company" varchar,
  	"address_line1" varchar,
  	"address_line2" varchar,
  	"city" varchar,
  	"state" varchar,
  	"postal_code" varchar,
  	"country" "enum_addresses_country" NOT NULL,
  	"phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"product_id" integer,
  	"inventory" numeric DEFAULT 0,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
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
  
  CREATE TABLE "_variants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_product_id" integer,
  	"version_inventory" numeric DEFAULT 0,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
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
  
  CREATE TABLE "products_colour" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_colour",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_diamond_shape" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_diamond_shape",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer,
  	"value" varchar
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"details" jsonb,
  	"category_id" integer,
  	"availability" "enum_products_availability" DEFAULT 'made-to-order',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"inventory" numeric DEFAULT 0,
  	"enable_variants" boolean,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"collections_id" integer,
  	"sizes_id" integer,
  	"variant_types_id" integer
  );
  
  CREATE TABLE "_products_v_version_colour" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_colour",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_version_diamond_shape" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_diamond_shape",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_version_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_details" jsonb,
  	"version_category_id" integer,
  	"version_availability" "enum__products_v_version_availability" DEFAULT 'made-to-order',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_inventory" numeric DEFAULT 0,
  	"version_enable_variants" boolean,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"collections_id" integer,
  	"sizes_id" integer,
  	"variant_types_id" integer
  );
  
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"size_id" integer
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
  
  CREATE TABLE "shop" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"warranty" jsonb,
  	"delivery" jsonb,
  	"listing_subtitle" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sizes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "attributes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "addresses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variants_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variant_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variant_options_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "carts_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sizes" ADD CONSTRAINT "sizes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attributes_options" ADD CONSTRAINT "attributes_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_parent_id_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "public"."variant_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_colour" ADD CONSTRAINT "products_colour_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_diamond_shape" ADD CONSTRAINT "products_diamond_shape_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_colour" ADD CONSTRAINT "_products_v_version_colour_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_diamond_shape" ADD CONSTRAINT "_products_v_version_diamond_shape_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_seo_seo_image_idx" ON "categories" USING btree ("seo_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE INDEX "sizes_value_idx" ON "sizes" USING btree ("value");
  CREATE INDEX "sizes_category_idx" ON "sizes" USING btree ("category_id");
  CREATE INDEX "sizes_updated_at_idx" ON "sizes" USING btree ("updated_at");
  CREATE INDEX "sizes_created_at_idx" ON "sizes" USING btree ("created_at");
  CREATE INDEX "attributes_options_order_idx" ON "attributes_options" USING btree ("_order");
  CREATE INDEX "attributes_options_parent_id_idx" ON "attributes_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "attributes_name_idx" ON "attributes" USING btree ("name");
  CREATE INDEX "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  CREATE INDEX "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
  CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
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
  CREATE INDEX "_variants_v_parent_idx" ON "_variants_v" USING btree ("parent_id");
  CREATE INDEX "_variants_v_version_version_product_idx" ON "_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_variants_v_version_version_image_idx" ON "_variants_v" USING btree ("version_image_id");
  CREATE INDEX "_variants_v_version_version_updated_at_idx" ON "_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_variants_v_version_version_created_at_idx" ON "_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_variants_v_version_version_deleted_at_idx" ON "_variants_v" USING btree ("version_deleted_at");
  CREATE INDEX "_variants_v_version_version__status_idx" ON "_variants_v" USING btree ("version__status");
  CREATE INDEX "_variants_v_created_at_idx" ON "_variants_v" USING btree ("created_at");
  CREATE INDEX "_variants_v_updated_at_idx" ON "_variants_v" USING btree ("updated_at");
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
  CREATE INDEX "products_colour_order_idx" ON "products_colour" USING btree ("order");
  CREATE INDEX "products_colour_parent_idx" ON "products_colour" USING btree ("parent_id");
  CREATE INDEX "products_colour_value_idx" ON "products_colour" USING btree ("value");
  CREATE INDEX "products_diamond_shape_order_idx" ON "products_diamond_shape" USING btree ("order");
  CREATE INDEX "products_diamond_shape_parent_idx" ON "products_diamond_shape" USING btree ("parent_id");
  CREATE INDEX "products_diamond_shape_value_idx" ON "products_diamond_shape" USING btree ("value");
  CREATE INDEX "products_attributes_order_idx" ON "products_attributes" USING btree ("_order");
  CREATE INDEX "products_attributes_parent_id_idx" ON "products_attributes" USING btree ("_parent_id");
  CREATE INDEX "products_attributes_attribute_idx" ON "products_attributes" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_availability_idx" ON "products" USING btree ("availability");
  CREATE INDEX "products_seo_seo_image_idx" ON "products" USING btree ("seo_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_collections_id_idx" ON "products_rels" USING btree ("collections_id");
  CREATE INDEX "products_rels_sizes_id_idx" ON "products_rels" USING btree ("sizes_id");
  CREATE INDEX "products_rels_variant_types_id_idx" ON "products_rels" USING btree ("variant_types_id");
  CREATE INDEX "_products_v_version_colour_order_idx" ON "_products_v_version_colour" USING btree ("order");
  CREATE INDEX "_products_v_version_colour_parent_idx" ON "_products_v_version_colour" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_colour_value_idx" ON "_products_v_version_colour" USING btree ("value");
  CREATE INDEX "_products_v_version_diamond_shape_order_idx" ON "_products_v_version_diamond_shape" USING btree ("order");
  CREATE INDEX "_products_v_version_diamond_shape_parent_idx" ON "_products_v_version_diamond_shape" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_diamond_shape_value_idx" ON "_products_v_version_diamond_shape" USING btree ("value");
  CREATE INDEX "_products_v_version_attributes_order_idx" ON "_products_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_products_v_version_attributes_parent_id_idx" ON "_products_v_version_attributes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_attributes_attribute_idx" ON "_products_v_version_attributes" USING btree ("attribute_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_availability_idx" ON "_products_v" USING btree ("version_availability");
  CREATE INDEX "_products_v_version_seo_version_seo_image_idx" ON "_products_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_collections_id_idx" ON "_products_v_rels" USING btree ("collections_id");
  CREATE INDEX "_products_v_rels_sizes_id_idx" ON "_products_v_rels" USING btree ("sizes_id");
  CREATE INDEX "_products_v_rels_variant_types_id_idx" ON "_products_v_rels" USING btree ("variant_types_id");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_items_size_idx" ON "carts_items" USING btree ("size_id");
  CREATE INDEX "carts_secret_idx" ON "carts" USING btree ("secret");
  CREATE INDEX "carts_customer_idx" ON "carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");
  CREATE INDEX "payload_locked_documents_rels_sizes_id_idx" ON "payload_locked_documents_rels" USING btree ("sizes_id");
  CREATE INDEX "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_variant_types_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_types_id");
  CREATE INDEX "payload_locked_documents_rels_variant_options_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_options_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");`)
}

/**
 * HAND-EDITED, deliberately: every DROP in `down` is `IF EXISTS`.
 *
 * As generated, the rollback dropped each table `CASCADE` — which already removes the foreign-key
 * constraints on `payload_locked_documents_rels` — and then tried to drop those same constraints
 * explicitly. Postgres refuses: `constraint "payload_locked_documents_rels_customers_fk" ... does
 * not exist`, and the whole rollback aborts.
 *
 * Constitution IV requires a rollback path that has been RUN, not one that has been written. This
 * one has: up → down → up, verified against a live database.
 *
 * Re-generating this migration will reintroduce the problem. Re-apply the same edit.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sizes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attributes_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "addresses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variants_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_variants_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_variants_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variant_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "variant_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_colour" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_diamond_shape" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_colour" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_diamond_shape" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "customers_sessions" CASCADE;
  DROP TABLE IF EXISTS "customers" CASCADE;
  DROP TABLE IF EXISTS "categories" CASCADE;
  DROP TABLE IF EXISTS "collections" CASCADE;
  DROP TABLE IF EXISTS "sizes" CASCADE;
  DROP TABLE IF EXISTS "attributes_options" CASCADE;
  DROP TABLE IF EXISTS "attributes" CASCADE;
  DROP TABLE IF EXISTS "addresses" CASCADE;
  DROP TABLE IF EXISTS "variants" CASCADE;
  DROP TABLE IF EXISTS "variants_rels" CASCADE;
  DROP TABLE IF EXISTS "_variants_v" CASCADE;
  DROP TABLE IF EXISTS "_variants_v_rels" CASCADE;
  DROP TABLE IF EXISTS "variant_types" CASCADE;
  DROP TABLE IF EXISTS "variant_options" CASCADE;
  DROP TABLE IF EXISTS "products_colour" CASCADE;
  DROP TABLE IF EXISTS "products_diamond_shape" CASCADE;
  DROP TABLE IF EXISTS "products_attributes" CASCADE;
  DROP TABLE IF EXISTS "products" CASCADE;
  DROP TABLE IF EXISTS "products_rels" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_colour" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_diamond_shape" CASCADE;
  DROP TABLE IF EXISTS "_products_v_version_attributes" CASCADE;
  DROP TABLE IF EXISTS "_products_v" CASCADE;
  DROP TABLE IF EXISTS "_products_v_rels" CASCADE;
  DROP TABLE IF EXISTS "carts_items" CASCADE;
  DROP TABLE IF EXISTS "carts" CASCADE;
  DROP TABLE IF EXISTS "shop" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_customers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_collections_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sizes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_attributes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_addresses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_variants_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_variant_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_variant_options_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_products_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_carts_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_customers_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_categories_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_collections_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_sizes_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_attributes_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_addresses_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_variants_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_variant_types_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_variant_options_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_products_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_carts_id_idx";
  DROP INDEX IF EXISTS "payload_preferences_rels_customers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "collections_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sizes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "attributes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "addresses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "variants_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "variant_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "variant_options_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "carts_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "customers_id";
  DROP TYPE IF EXISTS "public"."enum_attributes_type";
  DROP TYPE IF EXISTS "public"."enum_addresses_country";
  DROP TYPE IF EXISTS "public"."enum_variants_status";
  DROP TYPE IF EXISTS "public"."enum__variants_v_version_status";
  DROP TYPE IF EXISTS "public"."enum_products_colour";
  DROP TYPE IF EXISTS "public"."enum_products_diamond_shape";
  DROP TYPE IF EXISTS "public"."enum_products_availability";
  DROP TYPE IF EXISTS "public"."enum_products_status";
  DROP TYPE IF EXISTS "public"."enum__products_v_version_colour";
  DROP TYPE IF EXISTS "public"."enum__products_v_version_diamond_shape";
  DROP TYPE IF EXISTS "public"."enum__products_v_version_availability";
  DROP TYPE IF EXISTS "public"."enum__products_v_version_status";
  DROP TYPE IF EXISTS "public"."enum_carts_currency";`)
}
