/**
 * A no-op stand-in for the `server-only` package, used by the Vitest aliases.
 *
 * The real package exports a module that throws the moment it is pulled into a client bundle — a
 * build-time tripwire that keeps server modules server-side. Vitest's node environment is neither a
 * server component nor a client bundle, so importing the real thing fails and would leave us
 * choosing between testing the logic and guarding it. Aliasing here keeps both: production code
 * still carries the import, and the tests can reach the pure functions behind it.
 */
export {}
