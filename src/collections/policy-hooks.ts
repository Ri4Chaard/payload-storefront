import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

/**
 * Two policies may not share an address.
 *
 * **The `unique` constraint on `slugField` already enforces this.** What it cannot do is say
 * anything useful when it fires: Postgres reports a violated index by name, which tells an editor
 * that `policies_slug_idx` is unhappy and nothing about what to do next. This hook fails first, and
 * names the page holding the address.
 *
 * Constitution IV asks for validation at the field level so invalid content cannot be saved in the
 * first place. The spec's Edge Cases ask for more than that — "rejected at save time with a message
 * that says which other page holds it" — because the editor who hits this is mid-way through
 * creating a page and needs to know whether to pick a different slug or go and look at an existing
 * one.
 *
 * **There is no category check and no reserved-route list here**, and their absence is a
 * consequence of the `/legal/` prefix rather than an oversight. An earlier
 * design served policies at bare root addresses, where a policy slugged `category-1` would have been
 * permanently shadowed by the catalogue and one slugged `about` would have shadowed a real page —
 * so it needed both checks plus a hardcoded list of every top-level route on the site. That list
 * would have rotted the first time somebody shipped a page and forgot to add it. Under the prefix
 * this collection owns its namespace outright: `/legal/category-1` collides with nothing.
 */
export const rejectDuplicateSlug: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const slug = data?.slug

  // `beforeValidate` also runs for a partial update that does not touch the slug at all.
  if (typeof slug !== 'string' || slug.length === 0) return data

  // Unchanged on an update is not a collision with itself.
  if (operation === 'update' && originalDoc?.slug === slug) return data

  const existing = await req.payload.find({
    collection: 'policies',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    // The check must see drafts and other editors' unpublished work, or two policies can be created
    // at one address and only the second one to publish will be reachable.
    overrideAccess: true,
    draft: true,
  })

  const clash = existing.docs.find((document) => document.id !== originalDoc?.id)
  if (!clash) return data

  throw new ValidationError({
    errors: [
      {
        path: 'slug',
        message: `“${slug}” is already the address of “${clash.title}”. Every policy needs its own.`,
      },
    ],
  })
}
