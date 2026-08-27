/* THIS FILE IS PART OF THE PAYLOAD ADMIN MOUNT. Generated shape — keep in sync with Payload. */
import type { ServerFunctionClient } from 'payload'
import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

// Payload's own admin stylesheet. Without it the panel renders as unstyled HTML — and because our
// admin sheet deliberately omits Tailwind's preflight, nothing else supplies base styling either.
// Import order matters: Payload's CSS first, our overrides second.
import '@payloadcms/next/css'

import { importMap } from './admin/importMap.js'
import './custom.css'

type Args = { children: React.ReactNode }

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
