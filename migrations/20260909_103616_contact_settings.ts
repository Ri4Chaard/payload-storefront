import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contact_settings_messengers_platform" AS ENUM('instagram', 'telegram', 'whatsapp');
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
  	"message_template" varchar DEFAULT 'Hello Aurum, I would like to order:
  
  {{items}}
  
  Total: {{total}}
  
  {{customer}}',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "contact_settings_messengers" ADD CONSTRAINT "contact_settings_messengers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contact_settings_messengers_order_idx" ON "contact_settings_messengers" USING btree ("_order");
  CREATE INDEX "contact_settings_messengers_parent_id_idx" ON "contact_settings_messengers" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "contact_settings_messengers" CASCADE;
  DROP TABLE "contact_settings" CASCADE;
  DROP TYPE "public"."enum_contact_settings_messengers_platform";`)
}
