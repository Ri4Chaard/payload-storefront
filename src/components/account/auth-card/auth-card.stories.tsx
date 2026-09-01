import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { OtpInput } from '@/components/ui/otp-input'
import { TextInput } from '@/components/ui/text-input'

import { AuthCard } from './auth-card'

/**
 * The shell behind all five auth screens. These stories show it holding each of the shapes it has
 * to hold, so the spacing is judged against real content rather than a placeholder block.
 */
const meta = {
  title: 'Account/AuthCard',
  component: AuthCard,
} satisfies Meta<typeof AuthCard>

export default meta
type Story = StoryObj<typeof meta>

/** Node `408:7416` — sign in. */
export const SignIn: Story = {
  args: {
    title: 'WELCOME BACK',
    subtitle: 'Please fill in the information below:',
    footer: (
      <>
        Don’t have an account? <Link href="/create-account">Create one</Link>
      </>
    ),
    children: (
      <>
        <TextInput label="Email Address" placeholder="Email Address" hideLabel type="email" />
        <TextInput
          label="Password"
          placeholder="Password"
          hideLabel
          type="password"
          trailing={<Link href="/forgot-password">Forgot password?</Link>}
        />
        <Button variant="primary" className="w-full">
          Log in
        </Button>
      </>
    ),
  },
}

/** Node `428:11646` — create account, with the consent control the design does not draw. */
export const CreateAccount: Story = {
  args: {
    title: 'CREATE ACCOUNT',
    subtitle: 'Please fill in the information below:',
    footer: (
      <>
        Already have an account? <Link href="/sign-in">Log in</Link>
      </>
    ),
    children: (
      <>
        <TextInput label="Email Address" placeholder="Email Address" hideLabel type="email" />
        <TextInput label="Password" placeholder="Password" hideLabel type="password" />
        <TextInput
          label="Confirm Password"
          placeholder="Confirm Password"
          hideLabel
          type="password"
        />
        <Button variant="primary" className="w-full">
          Create Account
        </Button>
      </>
    ),
  },
}

/** Node `428:11921` — the verification step, holding the six-box code control. */
export const VerifyEmail: Story = {
  args: {
    title: 'VERIFY YOUR EMAIL',
    subtitle: 'We’ve sent a verification code to your email address',
    footer: (
      <>
        Didn’t receive the code? <Link href="#">Resend</Link>
      </>
    ),
    children: (
      <>
        <OtpInput label="Verification code" name="code" />
        <Button variant="primary" className="w-full">
          Verify
        </Button>
      </>
    ),
  },
}

/** The same step after a wrong code — node `429:12615`. */
export const InvalidCode: Story = {
  args: {
    ...VerifyEmail.args,
    children: (
      <>
        <OtpInput
          label="Verification code"
          name="code"
          value="582"
          error="Invalid code. Please try again."
        />
        <Button variant="primary" className="w-full">
          Verify
        </Button>
      </>
    ),
  },
}
