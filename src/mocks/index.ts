/**
 * Mock content (001/T088, 002/FR-001).
 *
 * **Only route-level loaders may import from here.** A component that reaches into `src/mocks/`
 * has hardcoded its content, and the swap to Payload in a later spec stops being one file per
 * route and becomes a rewrite. Sections take their content as props; the route reads it. That rule
 * is the whole reason this directory exists rather than the strings living inline.
 *
 * The shapes here deliberately mirror what Payload will return — a photograph is `src`, `width`,
 * `height` and `alt`, the way an upload comes back, not a bare string — so the swap changes where
 * the data comes from and nothing about how it is consumed.
 *
 * This is a recorded deviation from Constitution I, staged in spec 001 and bounded by 002/FR-001
 * through FR-004. See `specs/002-home-page/spec.md`.
 */
export type { HomeContent, MockCategory, MockImage, MockLink, MockProduct } from './home'
export { homeContent } from './home'
