import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops `account_settings.marketing_enabled` (spec 004).
 *
 * The switch decided whether the registration form drew a marketing-consent checkbox at all. It is
 * gone because only one of its two settings was ever correct: consent is always asked for, always
 * unticked, and never a condition of registering (FR-036, FR-036a). Turning it off looked free and
 * was not — it silently stopped asking a question that cannot be put to that customer again for
 * that registration.
 *
 * **No data is lost that anyone would miss.** The column held one boolean on a single global row,
 * and its value no longer changes any behaviour: the box is drawn either way. `down` restores the
 * column with its original default, so rolling back gives a shop that had it off a checkbox that
 * is now on — which is the same direction this migration moves in, and the safe one.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "account_settings" DROP COLUMN "marketing_enabled";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "account_settings" ADD COLUMN "marketing_enabled" boolean DEFAULT true;`)
}
