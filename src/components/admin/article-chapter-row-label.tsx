'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

/**
 * What a collapsed chapter row says in the admin.
 *
 * Payload labels array rows by their position — `Chapter 01`, `Chapter 02` — which is unreadable
 * the moment an article has eight of them and the whole point of the list is to drag them into a
 * different order. The Constitution's *Editorial verification* gate calls a content model that is
 * unusable in the admin a defect regardless of how well it renders, and a stack of numbered rows
 * an editor has to expand one at a time to find the one they meant is exactly that.
 *
 * Falls back to the position when a chapter has no heading yet, which is the state every chapter
 * passes through in its first second of existence.
 */
export function ArticleChapterRowLabel() {
  const { data, rowNumber } = useRowLabel<{ heading?: string }>()
  const position = `Chapter ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`

  return <span>{data?.heading?.trim() || position}</span>
}
