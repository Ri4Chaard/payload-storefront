import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_customers_marketing_email_source" AS ENUM('registration', 'profile');
  CREATE TYPE "public"."enum_verification_codes_purpose" AS ENUM('verify-email', 'reset-password');
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
  
  CREATE TABLE "account" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sign_in_title" varchar DEFAULT 'WELCOME BACK',
  	"sign_in_subtitle" varchar DEFAULT 'Please fill in the information below:',
  	"sign_in_email_label" varchar DEFAULT 'Email Address',
  	"sign_in_password_label" varchar DEFAULT 'Password',
  	"sign_in_forgot_link" varchar DEFAULT 'Forgot password?',
  	"sign_in_submit" varchar DEFAULT 'Log in',
  	"sign_in_create_prompt" varchar DEFAULT 'Don’t have an account? Create one',
  	"sign_in_failed" varchar DEFAULT 'That email address and password do not match.',
  	"sign_in_locked" varchar DEFAULT 'Too many attempts. For your security, try again in a few minutes or reset your password.',
  	"create_title" varchar DEFAULT 'CREATE ACCOUNT',
  	"create_subtitle" varchar DEFAULT 'Please fill in the information below:',
  	"create_confirm_label" varchar DEFAULT 'Confirm Password',
  	"create_submit" varchar DEFAULT 'Create Account',
  	"create_sign_in_prompt" varchar DEFAULT 'Already have an account? Log in',
  	"create_marketing_consent" varchar DEFAULT 'Email me occasional news and offers.',
  	"create_password_mismatch" varchar DEFAULT 'The two passwords do not match.',
  	"create_password_too_weak" varchar DEFAULT 'Use at least 8 characters, and avoid a password you use elsewhere.',
  	"verify_title" varchar DEFAULT 'VERIFY YOUR EMAIL',
  	"verify_subtitle" varchar DEFAULT 'We’ve sent a verification code to your email address',
  	"verify_code_label" varchar DEFAULT 'Verification code',
  	"verify_submit" varchar DEFAULT 'Verify',
  	"verify_resend_prompt" varchar DEFAULT 'Didn’t receive the code? Resend',
  	"verify_resend_sent" varchar DEFAULT 'A new code is on its way.',
  	"verify_resend_too_soon" varchar DEFAULT 'Please wait a moment before requesting another code.',
  	"code_invalid" varchar DEFAULT 'Invalid code. Please try again.',
  	"code_expired" varchar DEFAULT 'That code has expired. Request a new one.',
  	"code_already_used" varchar DEFAULT 'That code has already been used. Request a new one.',
  	"code_superseded" varchar DEFAULT 'A newer code was sent. Please use the most recent one.',
  	"code_too_many_attempts" varchar DEFAULT 'Too many incorrect attempts. Request a new code.',
  	"forgot_title" varchar DEFAULT 'FORGOT PASSWORD',
  	"forgot_subtitle" varchar DEFAULT 'Enter the email address associated with your account.',
  	"forgot_submit" varchar DEFAULT 'Send code',
  	"forgot_back_link" varchar DEFAULT 'Back to sign in',
  	"forgot_sent" varchar DEFAULT 'If that address has an account, a code is on its way. Check your inbox.',
  	"reset_code_title" varchar DEFAULT 'ENTER THE CODE',
  	"reset_code_subtitle" varchar DEFAULT 'We have sent a 6-digit code to your email',
  	"reset_title" varchar DEFAULT 'NEW PASSWORD',
  	"reset_subtitle" varchar DEFAULT 'Create a new password for your account.',
  	"reset_new_label" varchar DEFAULT 'New password',
  	"reset_confirm_label" varchar DEFAULT 'Repeat password',
  	"reset_submit" varchar DEFAULT 'Save',
  	"reset_done" varchar DEFAULT 'Your password has been changed. You can sign in with it now.',
  	"success_title" varchar DEFAULT 'Successful registration',
  	"success_body" varchar DEFAULT 'Your account has been successfully created. Welcome to AURUM!',
  	"success_action" varchar DEFAULT 'Start shopping',
  	"profile_title" varchar DEFAULT 'My account',
  	"profile_email_label" varchar DEFAULT 'Email',
  	"profile_name_label" varchar DEFAULT 'Full name',
  	"profile_name_empty" varchar DEFAULT 'No name added',
  	"profile_addresses_label" varchar DEFAULT 'Addresses',
  	"profile_addresses_empty" varchar DEFAULT 'No addresses added',
  	"profile_marketing_label" varchar DEFAULT 'Marketing preferences',
  	"profile_marketing_email_toggle" varchar DEFAULT 'Email',
  	"profile_security_label" varchar DEFAULT 'Security',
  	"profile_change_password" varchar DEFAULT 'Change password',
  	"profile_sign_out" varchar DEFAULT 'Sign out',
  	"profile_save_failed" varchar DEFAULT 'That didn’t save. Please try again.',
  	"name_modal_title" varchar DEFAULT 'FULL NAME',
  	"name_modal_first" varchar DEFAULT 'First name',
  	"name_modal_last" varchar DEFAULT 'Last name',
  	"address_modal_title" varchar DEFAULT 'ADD ADDRESS',
  	"address_modal_edit_title" varchar DEFAULT 'EDIT ADDRESS',
  	"address_country_label" varchar DEFAULT 'Country',
  	"address_line1_label" varchar DEFAULT 'Address line 1',
  	"address_line2_label" varchar DEFAULT 'Address line 2 (optional)',
  	"address_apartment_label" varchar DEFAULT 'Apartment, suite, etc (optional)',
  	"address_city_label" varchar DEFAULT 'City',
  	"address_postcode_label" varchar DEFAULT 'Postcode',
  	"address_default_label" varchar DEFAULT 'This is my default address',
  	"address_delete_confirm" varchar DEFAULT 'Delete this address?',
  	"change_password_title" varchar DEFAULT 'CHANGE PASSWORD',
  	"change_password_current" varchar DEFAULT 'Current password',
  	"change_password_wrong" varchar DEFAULT 'That is not your current password.',
  	"modal_cancel" varchar DEFAULT 'Cancel',
  	"modal_save" varchar DEFAULT 'Save',
  	"modal_close" varchar DEFAULT 'Close',
  	"verify_email_subject" varchar DEFAULT 'Your Aurum verification code',
  	"verify_email_body" varchar DEFAULT 'Use this code to confirm your email address. It expires in 10 minutes. If you didn’t create an Aurum account, you can ignore this message.',
  	"reset_email_subject" varchar DEFAULT 'Your Aurum password reset code',
  	"reset_email_body" varchar DEFAULT 'Use this code to set a new password. It expires in 10 minutes. If you didn’t ask to reset your password, you can ignore this message — nothing has changed.',
  	"password_changed_subject" varchar DEFAULT 'Your Aurum password was changed',
  	"password_changed_body" varchar DEFAULT 'The password on your Aurum account has just been changed, and you have been signed out everywhere else. If this wasn’t you, reset your password immediately and contact us.',
  	"default_country" varchar DEFAULT 'AE',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "addresses" ALTER COLUMN "country" SET DATA TYPE text;
  DROP TYPE "public"."enum_addresses_country";
  CREATE TYPE "public"."enum_addresses_country" AS ENUM('AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV', 'BR', 'IO', 'VG', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'BQ', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'KP', 'MK', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'KR', 'SS', 'ES', 'LK', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UM', 'VI', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'WF', 'EH', 'YE', 'ZM', 'ZW');
  ALTER TABLE "addresses" ALTER COLUMN "country" SET DATA TYPE "public"."enum_addresses_country" USING "country"::"public"."enum_addresses_country";
  ALTER TABLE "addresses" ALTER COLUMN "address_line1" SET NOT NULL;
  ALTER TABLE "addresses" ALTER COLUMN "city" SET NOT NULL;
  ALTER TABLE "addresses" ALTER COLUMN "postal_code" SET NOT NULL;
  ALTER TABLE "customers" ADD COLUMN "first_name" varchar;
  ALTER TABLE "customers" ADD COLUMN "last_name" varchar;
  ALTER TABLE "customers" ADD COLUMN "marketing_email" boolean DEFAULT false;
  ALTER TABLE "customers" ADD COLUMN "marketing_email_updated_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "marketing_email_source" "enum_customers_marketing_email_source";
  ALTER TABLE "customers" ADD COLUMN "_verified" boolean;
  ALTER TABLE "customers" ADD COLUMN "_verificationtoken" varchar;
  ALTER TABLE "addresses" ADD COLUMN "apartment" varchar;
  ALTER TABLE "addresses" ADD COLUMN "is_default" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "verification_codes_id" integer;
  ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "verification_codes_email_idx" ON "verification_codes" USING btree ("email");
  CREATE INDEX "verification_codes_customer_idx" ON "verification_codes" USING btree ("customer_id");
  CREATE INDEX "verification_codes_purpose_idx" ON "verification_codes" USING btree ("purpose");
  CREATE INDEX "verification_codes_expires_at_idx" ON "verification_codes" USING btree ("expires_at");
  CREATE INDEX "verification_codes_updated_at_idx" ON "verification_codes" USING btree ("updated_at");
  CREATE INDEX "verification_codes_created_at_idx" ON "verification_codes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verification_codes_fk" FOREIGN KEY ("verification_codes_id") REFERENCES "public"."verification_codes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_verification_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("verification_codes_id");`)
}

/**
 * Two edits to the generated `down`. Both were found by running it, which is the only way either
 * would have been found — see 004/quickstart.md.
 *
 * **1. `DROP CONSTRAINT` needed `IF EXISTS`.** `DROP TABLE "verification_codes" CASCADE` two lines
 * above already removes the foreign key, so dropping it again aborted the whole rollback with
 * `constraint ... does not exist`. As generated, this migration could not be rolled back at all,
 * with or without data. The same applies to the index below.
 *
 * **2. The country enum narrows, and narrowing can destroy data.** The `up` widened
 * `enum_addresses_country` from the plugin's forty values to all 249; the `down` puts the forty
 * back with a hard cast. Any address stored as, say, `KZ` — which is the country in the sample
 * address the design itself draws — has no representation in the old enum, and the cast fails with
 * Postgres's own `invalid input value for enum` and nothing to act on.
 *
 * The guard below turns that into a refusal that says what is wrong and how many rows are involved.
 * It deliberately does NOT rewrite or delete those addresses: rolling the schema back is a
 * reversible act, and quietly discarding a customer's address to make it succeed is not. An
 * operator who genuinely needs the rollback resolves the rows first, having been told which.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "verification_codes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "verification_codes" CASCADE;
  DROP TABLE "account" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_verification_codes_fk";

  DO $$
  DECLARE
    stranded bigint;
  BEGIN
    SELECT count(*) INTO stranded
    FROM "addresses"
    WHERE "country"::text NOT IN ('US','GB','CA','AU','AT','BE','BR','BG','CY','CZ','DK','EE','FI','FR','DE','GR','HK','HU','IN','IE','IT','JP','LV','LT','LU','MY','MT','MX','NL','NZ','NO','PL','PT','RO','SG','SK','SI','ES','SE','CH');

    IF stranded > 0 THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Cannot roll back: %s saved address(es) use a country outside the pre-004 list of 40.', stranded),
        HINT = 'Re-country or delete those addresses first: SELECT id, country FROM addresses WHERE country::text NOT IN (...). They are NOT removed automatically — that would discard customer data to make a schema change succeed.';
    END IF;
  END $$;

  ALTER TABLE "addresses" ALTER COLUMN "country" SET DATA TYPE text;
  DROP TYPE "public"."enum_addresses_country";
  CREATE TYPE "public"."enum_addresses_country" AS ENUM('US', 'GB', 'CA', 'AU', 'AT', 'BE', 'BR', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HK', 'HU', 'IN', 'IE', 'IT', 'JP', 'LV', 'LT', 'LU', 'MY', 'MT', 'MX', 'NL', 'NZ', 'NO', 'PL', 'PT', 'RO', 'SG', 'SK', 'SI', 'ES', 'SE', 'CH');
  ALTER TABLE "addresses" ALTER COLUMN "country" SET DATA TYPE "public"."enum_addresses_country" USING "country"::"public"."enum_addresses_country";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_verification_codes_id_idx";
  ALTER TABLE "addresses" ALTER COLUMN "address_line1" DROP NOT NULL;
  ALTER TABLE "addresses" ALTER COLUMN "city" DROP NOT NULL;
  ALTER TABLE "addresses" ALTER COLUMN "postal_code" DROP NOT NULL;
  ALTER TABLE "customers" DROP COLUMN "first_name";
  ALTER TABLE "customers" DROP COLUMN "last_name";
  ALTER TABLE "customers" DROP COLUMN "marketing_email";
  ALTER TABLE "customers" DROP COLUMN "marketing_email_updated_at";
  ALTER TABLE "customers" DROP COLUMN "marketing_email_source";
  ALTER TABLE "customers" DROP COLUMN "_verified";
  ALTER TABLE "customers" DROP COLUMN "_verificationtoken";
  ALTER TABLE "addresses" DROP COLUMN "apartment";
  ALTER TABLE "addresses" DROP COLUMN "is_default";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "verification_codes_id";
  DROP TYPE "public"."enum_customers_marketing_email_source";
  DROP TYPE "public"."enum_verification_codes_purpose";`)
}
