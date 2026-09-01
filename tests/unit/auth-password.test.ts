import { describe, expect, it } from 'vitest'

import { checkPassword } from '@/lib/auth/password'

/**
 * FR-003. The rule is length and uniqueness, not composition — so what is worth testing is that a
 * long unusual password passes without decoration, and that the three refusals each fire for the
 * right reason rather than collapsing into one generic "too weak".
 */
describe('checkPassword', () => {
  it('accepts a long, unremarkable password with no symbols or digits', () => {
    expect(checkPassword('correcthorsebattery')).toEqual({ ok: true, problems: [] })
  })

  it('refuses anything under the minimum length', () => {
    const result = checkPassword('short1')
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('too-short')
  })

  it('accepts exactly the minimum length, not one more', () => {
    expect(checkPassword('abcdefgh').ok).toBe(true)
  })

  it('refuses a password from the common list, whatever its case', () => {
    expect(checkPassword('password123').problems).toContain('too-common')
    expect(checkPassword('PASSWORD123').problems).toContain('too-common')
    expect(checkPassword('PaSsWoRd123').problems).toContain('too-common')
  })

  it('refuses the customer’s own email address as their password', () => {
    const result = checkPassword('maghzym@example.com', 'Maghzym@Example.com')
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('contains-email')
  })

  it('refuses the local part of the address on its own', () => {
    expect(checkPassword('maghzymayash', 'maghzymayash@example.com').problems).toContain(
      'contains-email',
    )
  })

  it('does not refuse a short local part that happens to be a substring', () => {
    // A three-character floor stops "ab@example.com" making "abcdefgh" unusable for no reason.
    expect(checkPassword('abcdefgh', 'ab@example.com').ok).toBe(true)
  })

  it('reports every problem at once rather than stopping at the first', () => {
    const result = checkPassword('admin123', 'admin123@example.com')
    expect(result.problems).toContain('too-common')
    expect(result.problems.length).toBeGreaterThan(0)
  })
})
