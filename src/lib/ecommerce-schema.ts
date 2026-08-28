import type { Config, Plugin } from 'payload'

/**
 * Payload's own schema-accessor signature, derived rather than restated. Importing `JSONSchema4`
 * from `json-schema` would mean taking a direct dependency on a transitive type package purely to
 * name one argument.
 */
type SchemaAccessor = NonNullable<NonNullable<Config['typescript']>['schema']>[number]
type JsonSchema = Parameters<SchemaAccessor>[0]['jsonSchema']

/**
 * Prunes the e-commerce plugin's type schema down to the collections we actually enabled.
 *
 * **The problem.** The plugin pushes a `$ref` into the generated schema for every entry in its
 * `CollectionSlugMap`, and `orders` and `transactions` are non-optional in that map — they are named
 * whether or not the collections exist. With `orders: false`, generation dies on
 * `Missing $ref pointer "#/definitions/orders"`. Verified against
 * `@payloadcms/plugin-ecommerce@3.88.0`, `dist/utilities/pushTypeScriptProperties.js`.
 *
 * `addresses` is NOT pruned here, because `addresses: false` does not actually disable it — see the
 * note in payload.config.ts. Its definition is generated, so its reference resolves.
 *
 * **Why not just enable them.** Because the plugin's orders are created when a *transaction*
 * succeeds and its transactions are payment records, while an Aurum order is a request handed to
 * WhatsApp or Telegram with no payment anywhere. Spec 004 resolves that mismatch. Creating three
 * tables now to satisfy a schema reference would be modelling by accident.
 *
 * **How this works.** Payload applies `typescript.schema` functions in array order, and the plugin
 * PUSHES its own onto that array while it runs — so anything declared in the config literal runs
 * BEFORE it and gets overwritten. The only way to run last is to wrap the plugin itself and append
 * afterwards, which is what `withPrunedEcommerceTypes` does.
 *
 * **When to delete this.** The moment spec 004 enables orders and transactions. It is a workaround
 * with an expiry date, not a permanent layer.
 */
const DISABLED: readonly string[] = ['orders', 'transactions']

export const pruneDisabledEcommerceCollections: SchemaAccessor = ({ jsonSchema }) => {
  const ecommerce = jsonSchema.properties?.ecommerce as JsonSchema | undefined
  const collections = ecommerce?.properties?.collections as JsonSchema | undefined

  if (!collections?.properties) return jsonSchema

  for (const slug of DISABLED) {
    delete collections.properties[slug]
  }

  if (Array.isArray(collections.required)) {
    collections.required = collections.required.filter((slug) => !DISABLED.includes(String(slug)))
  }

  return jsonSchema
}

/**
 * Wraps the e-commerce plugin so the pruning runs after the plugin has pushed its own schema
 * function, rather than before it. Declaring `typescript.schema` in the config literal does not
 * work — see above.
 */
export const withPrunedEcommerceTypes =
  (plugin: Plugin): Plugin =>
  async (config) => {
    const next = await plugin(config)

    next.typescript = next.typescript ?? {}
    next.typescript.schema = [...(next.typescript.schema ?? []), pruneDisabledEcommerceCollections]

    return next
  }
