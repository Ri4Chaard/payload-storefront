import { getTranslations } from 'next-intl/server'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

/**
 * The branded 404 (001/FR-041, picked up here).
 *
 * Spec 001 required it and nothing rendered it — `notFound()` had no caller in the storefront until
 * now, so Next's own unstyled page was never reached and never missed. `/[category]` and, shortly,
 * `/products/[slug]` both call it deliberately: an unknown category, a slug that names nothing, and
 * a draft requested anonymously all arrive here, and all three must be indistinguishable from
 * outside. A 403 on an unpublished slug tells a stranger the product exists.
 *
 * It renders inside the storefront layout, so the header, the footer and the navigation come with
 * it — which is the difference between a dead end and a wrong turn.
 */
export default async function NotFound() {
  const t_nav = await getTranslations('nav')
  return (
    <Container
      as="section"
      className="text-neutral-primary flex flex-col items-center gap-5 py-25 text-center xl:py-37.5"
    >
      <p className="text-eyebrow text-neutral-secondary uppercase">404</p>

      <h1 className="text-display uppercase">{t_nav('pageDoesNotExist')}</h1>

      <p className="text-body-base text-neutral-secondary max-w-150">
        {t_nav('notFoundBody')}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="primary" href="/all-products">
          {t_nav('browseAll')}
        </Button>
        <Button variant="outline" href="/">
          {t_nav('backToHome')}
        </Button>
      </div>
    </Container>
  )
}
