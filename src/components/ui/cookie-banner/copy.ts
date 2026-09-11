/**
 * The banner's words, fixed in code (spec 009, FR-025).
 *
 * **This is a deliberate exception to Constitution I**, which requires user-visible copy to come
 * from Payload. The owner's instruction was explicit: the wording is settled and will not change.
 * It is recorded in `specs/009-policy-pages-cookie-consent/plan.md` under Complexity Tracking rather
 * than taken by omission, and it is coherent with the decision to build no analytics machinery —
 * adding a cookie category is already a developer task in this design, so fixed copy removes no
 * capability the site would otherwise have had.
 *
 * The cost is real and accepted: **changing any word below is a release**, and this is the one
 * legally-loaded sentence on the site the owner cannot correct themselves.
 *
 * **FR-025a is what makes that safe, and it constrains what may be written here.** The categories in
 * the chooser and the text of the Cookie Policy both stay editable, so anything this copy asserts
 * about the cookie set is an assertion the owner can silently contradict without either of us
 * noticing. So the rule is:
 *
 *   - it may say what the banner is FOR and point at the policy;
 *   - it may NOT enumerate categories, name providers, or state what the site does or does not
 *     track.
 *
 * Note what this means for the drawn copy at Figma `255:3381`, which is not used. It says the site
 * "uses third-party cookies, pixels, and similar technologies", "various Google services", and sends
 * "advertising materials in line with the preferences shown while browsing". None of that is true of
 * this site — there is no analytics, no tag manager and no third-party script anywhere in `src/` —
 * so shipping it would be publishing a false statement about data processing, and it would break
 * FR-025a twice over. FR-016 makes replacing it a requirement rather than a liberty.
 *
 * **FR-025b**: this text needs the same sign-off as the Cookie Policy itself before it ships.
 */
export const BANNER_COPY = {
  heading: 'Cookie Policy',
  body: 'We use cookies on this website. Our Cookie Policy explains which ones and why, and you can change your mind at any time from the link in the footer.',
  link: 'Cookie Policy',
  agree: 'Agree',
  configure: 'Configure All Cookies',
  technical: 'Allow Technical Cookies',
  /** The banner's accessible name — it is a landmark, and a landmark needs to say what it is. */
  region: 'Cookie consent',
} as const

/** The chooser's own labels. UI affordances rather than content: Constitution I permits these. */
export const CHOOSER_COPY = {
  title: 'Cookie settings',
  save: 'Save my choices',
  close: 'Close cookie settings',
  alwaysOn: 'Always on',
  /**
   * Shown when the site has configured nothing optional — the state on the day this ships, and
   * therefore the copy most visitors will actually read (FR-047, T052).
   */
  noOptional:
    'There is nothing optional to choose from. This website only uses the cookies it needs to work.',
  footerLink: 'Cookie Settings',
} as const
