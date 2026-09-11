import { mkdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * One suite at a time may rewrite the site's shared singletons (008/T103).
 *
 * **`test.describe.configure({ mode: 'serial' })` only reaches inside a file**, and this feature
 * has three suites that mutate the same rows from three workers: `contact.spec.ts` and
 * `contact-admin.spec.ts` both rewrite the `contact-page` global, and `faq.spec.ts` unpublishes
 * every question so that "every published question" is a set it controls. Run together with
 * `fullyParallel: true`, they interleave.
 *
 * Both failures this fixes were real and neither was a product defect:
 *
 *  - a metadata assertion read `Talk to Aurum` — the title the *next* test writes — because the
 *    two suites' writes crossed;
 *  - a restore threw `NotFound` because one suite deleted a question another had captured the id of.
 *
 * **An atomic `mkdir`, not a file write.** Creating a directory either succeeds or fails on every
 * POSIX filesystem, so two workers cannot both believe they hold it; `writeFile` has no such
 * guarantee. The same reason `mkdir` is the classic shell lock.
 *
 * **Held for a whole file rather than per test**, which is coarse and is the point: a suite that
 * unpublishes everything in `beforeAll` and restores it in `afterAll` is only safe if nothing else
 * runs in between.
 */

const LOCK = join(tmpdir(), 'aurum-shared-content.lock')

/** Long enough that a slow suite is never robbed, short enough that a killed worker is not fatal. */
const STALE_MS = 5 * 60 * 1000
const POLL_MS = 200
const TIMEOUT_MS = 5 * 60 * 1000

/**
 * A lock left behind by a worker that was killed mid-run — Ctrl-C, or a crash.
 *
 * Without this, one interrupted run makes every later run hang until the timeout. The age check is
 * deliberately generous: stealing a lock from a suite that is merely slow would reintroduce exactly
 * the interleaving this file exists to prevent.
 */
async function clearIfStale(): Promise<void> {
  try {
    const { mtimeMs } = await stat(LOCK)
    if (Date.now() - mtimeMs > STALE_MS) await rm(LOCK, { force: true, recursive: true })
  } catch {
    // Gone already, which is the outcome we wanted.
  }
}

/** Resolves with the release function. Call it in `afterAll`, whatever the suite did. */
export async function acquireSharedContentLock(): Promise<() => Promise<void>> {
  const deadline = Date.now() + TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      await mkdir(LOCK)
      return async () => {
        await rm(LOCK, { force: true, recursive: true })
      }
    } catch {
      await clearIfStale()
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
  }

  throw new Error(
    `Timed out waiting for the shared-content lock at ${LOCK}.\n` +
      'A suite that rewrites the contact page, the FAQ page or the questions collection is holding ' +
      'it, or a previous run was killed and left it behind — delete the directory to clear it.',
  )
}
