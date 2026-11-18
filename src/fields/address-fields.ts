import type { Field } from 'payload'

import type { EcommercePluginConfig } from '@payloadcms/plugin-ecommerce/types'

/**
 * The plugin's own `FieldsOverride`, derived rather than restated.
 *
 * It is not re-exported from `@payloadcms/plugin-ecommerce/types`, and reaching past the package's
 * export map into `dist/` to get at it would couple us to its build layout. Deriving it from the
 * config type that IS exported keeps the signature correct if the plugin changes it — the same move
 * `src/lib/ecommerce-schema.ts` makes for Payload's schema accessor.
 */
type AddressesConfig = Extract<
  NonNullable<EcommercePluginConfig['addresses']>,
  { addressFields?: unknown }
>
type FieldsOverride = NonNullable<AddressesConfig['addressFields']>

/**
 * The shape of a saved delivery address.
 *
 * **This does not create a collection.** `@payloadcms/plugin-ecommerce` already generates
 * `addresses` — with a `customer` relationship, admin-or-owner access on read, update and delete,
 * a `beforeChange` hook that assigns ownership from the request, and `country` promoted from text
 * to a select. All of it was already in `payload-types.ts` and already migrated before this spec
 * started, because `addresses: false` never disabled anything. Writing our own
 * would be the duplicate Principle II calls the most expensive mistake, one tier above components.
 *
 * So this file does two things: adds the two fields the design needs and the plugin lacks, and
 * makes required the four the form insists on.
 *
 * **Fields the plugin gives us that no screen shows** — `title`, `firstName`, `lastName`, `company`,
 * `state`, `phone` — are left alone rather than removed. Dropping fields from a collection we do not
 * own costs a migration and buys nothing, and a later spec (checkout, most likely) will want `state`
 * and `phone`. Their absence from the form is a decision, not an oversight.
 */

/** Required on the form, and therefore required in the database. FR-030. */
const REQUIRED_FIELD_NAMES = new Set(['addressLine1', 'city', 'postalCode'])

export const addressFields: FieldsOverride = ({ defaultFields }) => {
  const fields = defaultFields.map((field) => {
    if (!('name' in field) || !field.name) return field

    if (REQUIRED_FIELD_NAMES.has(field.name)) {
      return { ...field, required: true } as Field
    }

    // `addressLine2` stays optional and gains the design's own wording, so the admin panel and the
    // storefront agree about what it is for.
    if (field.name === 'addressLine2') {
      return {
        ...field,
        admin: { description: 'Optional. The second line of the street address.' },
      } as Field
    }

    return field
  })

  /**
   * Insert `apartment` directly after `addressLine2`, where the design draws it, rather than
   * appending it to the end. Field order in Payload is the order an editor sees, and an apartment
   * number below the postcode reads as a mistake.
   */
  const insertAt = fields.findIndex((f) => 'name' in f && f.name === 'addressLine2')
  const apartment: Field = {
    name: 'apartment',
    type: 'text',
    label: 'Apartment / suite',
    admin: {
      description:
        'Optional. Apartment, suite, unit, floor — whatever gets the courier to the door.',
    },
  }

  const withApartment =
    insertAt === -1
      ? [...fields, apartment]
      : [...fields.slice(0, insertAt + 1), apartment, ...fields.slice(insertAt + 1)]

  /**
   * `isDefault` is a plain checkbox here and an invariant in `address-hooks.ts`.
   *
   * The field cannot enforce "exactly one" on its own — that is a statement about the customer's
   * other rows, which a field validator cannot see. FR-031 lives in the hook.
   */
  const isDefault: Field = {
    name: 'isDefault',
    type: 'checkbox',
    label: 'Default address',
    defaultValue: false,
    admin: {
      description:
        'The address used first at checkout. Exactly one of a customer’s addresses is the default; ticking this one clears the previous.',
    },
  }

  return [...withApartment, isDefault]
}
