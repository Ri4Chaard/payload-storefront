'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { Menu } from '@/components/ui/menu'
import { MenuOption } from '@/components/ui/menu-option'

/**
 * The header's language switcher — trigger from node 196:782, panel from node 337:8233.
 *
 * Composed entirely from kit primitives: `Menu` supplies the disclosure behaviour, `MenuOption` the
 * rows. The panel's rows carry no dividers because its container has a border of its own, which is
 * what `divider={false}` is for.
 *
 * The accessible name is "Language: EN" rather than a bare "EN", so the trigger says what the code
 * refers to. It still CONTAINS the visible "EN", which WCAG 2.5.3 requires — an accessible name
 * that drops the visible text breaks voice control, where people say what they can see.
 */
export interface Locale {
  /** Displayed on the trigger and the row — "EN", "RU". */
  code: string
  /** Spoken name — "English", "Русский". */
  label: string
}

export interface LanguageSelectorProps {
  locales: Locale[]
  value: string
  onChange?: (code: string) => void
  className?: string
}

export function LanguageSelector({ locales, value, onChange, className }: LanguageSelectorProps) {
  const current = locales.find((locale) => locale.code === value) ?? locales[0]

  return (
    <Menu
      label={`Language: ${current?.code ?? ''}`}
      align="end"
      className={className}
      triggerClassName="text-body-medium text-neutral-primary hover:text-primary-default"
      trigger={
        <>
          <span>{current?.code}</span>
          <Icon name="chevron-down" size="xs" />
        </>
      }
    >
      {locales.map((locale) => (
        <MenuOption
          key={locale.code}
          divider={false}
          selected={locale.code === value}
          onClick={() => onChange?.(locale.code)}
        >
          {locale.code}
        </MenuOption>
      ))}
    </Menu>
  )
}
