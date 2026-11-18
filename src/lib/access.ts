import type { Access, FieldAccess } from 'payload'

/**
 * The six access functions the e-commerce plugin requires, plus the two it optionally accepts.
 *
 * Every one of them is stated explicitly. Constitution IV forbids relying on Payload's defaults by
 * omission — a collection that takes the default must say so deliberately, and none of these do.
 *
 * The privilege boundary is structural, not a role check: `admins` and `customers` are separate
 * collections, so `req.user.collection` is the whole test. There is no role field to get wrong.
 */

/** Store staff. The only identity Payload's admin panel authenticates. */
export const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

/**
 * Staff see everything; everyone else sees published documents only.
 *
 * Returning a `Where` rather than `false` is the entire mechanism behind FR-009. A draft is not
 * *hidden* from anonymous readers — it is unreachable, because the constraint is part of the query
 * rather than a filter applied to its results. A direct URL to a draft finds nothing.
 */
export const adminOrPublishedStatus: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  return { _status: { equals: 'published' } }
}

/**
 * A customer reaches their own documents and no one else's.
 *
 * Used by the plugin on carts. Constitution VI requires that one customer can never read another's,
 * and a `Where` on `customer` is what enforces it at the collection level rather than in a handler.
 */
export const isDocumentOwner: Access = ({ req }) => {
  if (!req.user) return false
  return { customer: { equals: req.user.id } }
}

/** Field-level. Guards `inventory` and anything else the public API has no business returning. */
export const adminOnlyFieldAccess: FieldAccess = ({ req }) => req.user?.collection === 'admins'

/** Field-level. Signed-in, and not staff. The plugin uses it to auto-assign ownership. */
export const isCustomer: FieldAccess = ({ req }) => req.user?.collection === 'customers'

/** Deliberately open. Named rather than inlined so that "public" is a decision with a spelling. */
export const publicAccess: Access = () => true

/**
 * Signed in as anybody — staff or customer.
 *
 * The plugin's addresses collection asks for this by name (`create: access.isAuthenticated`), and
 * until spec 004 we never passed it. The key is optional in the plugin's types, so the omission was
 * silent: `create` resolved to `undefined` and fell through to Payload's default. Constitution IV
 * forbids exactly that — a collection taking the default must say so deliberately — so the feature
 * that starts writing addresses is the one that closes it.
 *
 * Broader than `isCustomer` on purpose. An admin creating an address on a customer's behalf from
 * the panel is a thing the shop should be able to do; the owner check on read and update is what
 * keeps one customer out of another's, and that is a different function.
 */
export const isAuthenticated: Access = ({ req }) => Boolean(req.user)
