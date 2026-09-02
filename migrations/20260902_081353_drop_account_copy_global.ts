import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Removes the `account` global (spec 004, R11).
 *
 * The accounts feature shipped its customer-facing strings as an editable global. They are now
 * constants in `src/lib/auth/copy.ts` — the reasoning is written up there, and the short version is
 * that authentication screens are functional UI whose wording is load-bearing for security, not
 * content for an editor to own. What was genuinely configurable survives in `account-settings`, the
 * very next migration.
 *
 * **`up` destroys whatever was typed into that global.** There is exactly one row and its columns
 * all carry the shipped copy as defaults, so on any environment where nobody edited it the drop
 * loses nothing. If an environment DID edit it, those edits are the thing to port into `copy.ts`
 * before running this — the migration cannot do it, because the destination is source code.
 *
 * `down` restores the table with its defaults, so the previous release boots against it. It cannot
 * restore the row's contents; the previous release recreates the row from the same defaults.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "account" CASCADE;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "account" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sign_in_title" varchar DEFAULT 'WELCOME BACK',
  	"sign_in_subtitle" varchar DEFAULT 'Please fill in the information below:',
  	"sign_in_email_label" varchar DEFAULT 'Email Address',
  	"sign_in_password_label" varchar DEFAULT 'Password',
  	"sign_in_forgot_link" varchar DEFAULT 'Forgot password?',
  	"sign_in_submit" varchar DEFAULT 'Log in',
  	"sign_in_create_prompt" varchar DEFAULT 'Don’t have an account?',
  	"sign_in_create_link" varchar DEFAULT 'Create one',
  	"sign_in_failed" varchar DEFAULT 'That email address and password do not match.',
  	"sign_in_locked" varchar DEFAULT 'Too many attempts. For your security, try again in a few minutes or reset your password.',
  	"create_title" varchar DEFAULT 'CREATE ACCOUNT',
  	"create_subtitle" varchar DEFAULT 'Please fill in the information below:',
  	"create_confirm_label" varchar DEFAULT 'Confirm Password',
  	"create_submit" varchar DEFAULT 'Create Account',
  	"create_sign_in_prompt" varchar DEFAULT 'Already have an account?',
  	"create_sign_in_link" varchar DEFAULT 'Log in',
  	"create_marketing_consent" varchar DEFAULT 'Email me occasional news and offers.',
  	"create_email_invalid" varchar DEFAULT 'That does not look like an email address.',
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
  `)
}
