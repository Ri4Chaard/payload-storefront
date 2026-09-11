# Contract: The consent record

**Feature**: `specs/009-policy-pages-cookie-consent` | **Date**: 2026-09-11

The only piece of state this feature stores about a visitor. It lives in the visitor's browser and
nowhere else. This document is the authority on its shape, its encoding, and — the part that
actually matters — the rules for deciding whether it still counts.

---

## 1. Storage

| Property | Value | Why |
| --- | --- | --- |
| Name | `aurum-consent` | Matches the `aurum-` prefix the cart cookies already use. |
| Type | Cookie, **not** `httpOnly` | It is written and read by client JavaScript only. Nothing on the server reads it — see §6. |
| `path` | `/` | The decision is site-wide. |
| `sameSite` | `Lax` | Same reasoning as `aurum-cart`: a visitor who leaves for WhatsApp and returns must not be asked again. |
| `secure` | Production only | Matches `src/lib/cart/cookie.ts`. |
| `max-age` | `15552000` (180 days) | FR-035. Browser-enforced expiry is the reason this is a cookie rather than `localStorage` (research R3). |

This cookie is **strictly necessary** (FR-036). It is the answer to the cookie question; there is
nowhere else to keep it. It is never gated on consent, and it must be named in the Cookie Policy.

---

## 2. Shape

```jsonc
{
  "v": 1,                        // consentVersion in force when the decision was made
  "t": 1789123456,               // decision time, Unix seconds
  "o": ["necessary"],            // every category key OFFERED at that moment
  "a": ["necessary"]             // the subset the visitor ACCEPTED
}
```

Serialised with `JSON.stringify`, then `encodeURIComponent`. Read with `decodeURIComponent` then
`JSON.parse`, inside a `try`.

Field names are one character because a cookie is sent on every request to the origin. With one
category the encoded value is well under 100 bytes; with five it is still under 200.

**`o` is the field this contract exists for.** Without it the record cannot answer "was this visitor
ever shown the analytics category?", and FR-027a — the guard on the owner's decision that *Agree* and
*Allow Technical Cookies* look identical today — has nothing to stand on.

Invariants:

- `a ⊆ o`. A record accepting a category it was not offered is invalid (§4).
- Every necessary category key is present in both `o` and `a`, whatever the visitor chose. Refusing a
  strictly necessary category is not an option that exists.
- `o` and `a` are sorted, so two equal decisions serialise identically.

---

## 3. Writing

Written only in response to a deliberate visitor action: one of the three banner buttons, or **Save**
in the chooser.

| Action | `a` |
| --- | --- |
| *Agree* | all of `o` |
| *Allow Technical Cookies* | the necessary keys only |
| Chooser **Save** | the necessary keys, plus every optional key switched on |

`o` is always the full set of configured category keys at the moment of writing, and `v` is always
the current `consentVersion`. Never carried forward from a previous record — a stale `o` is exactly
the bug this design prevents.

Writing is a single `document.cookie` assignment. There is no Server Action and no route handler,
which is what keeps `cookies()` out of this feature entirely (research R3).

---

## 4. Reading, and when a record does not count

Read once on mount, client-side. The result is one of three states: **decided**, **must ask**, or
**must ask, carrying previous answers**.

Ask again — treating the visitor as having refused everything optional until they answer — when any
of these holds:

| Condition | Rule | Requirement |
| --- | --- | --- |
| No cookie | ask | FR-039 |
| Not decodable, not valid JSON, not an object | ask | FR-039 |
| Any field missing or of the wrong type | ask | FR-039 |
| `a ⊄ o` | ask | §2 invariant — tampered or corrupt |
| `v` < current `consentVersion` | ask, **pre-filling the chooser from `a`** | FR-042, and US4 scenario 1 |
| Some configured key is absent from `o` | ask, **pre-filling the chooser from `a`** | **FR-040** — a category added since the decision was never offered, so nothing in the record is consent to it |
| Cookie expired | ask (the browser has already removed it) | FR-035 |

Otherwise the visitor has decided, and the banner does not appear.

**Two rules that must not be collapsed into one.** "Ask" and "ask, pre-filling from `a`" differ only
in what the chooser starts from, and the distinction is the difference between respecting a
visitor's earlier choices and making them redo the work. A corrupt record has no trustworthy answers
to pre-fill from; a superseded one does.

### 4.1 Keys that no longer exist

A key present in the record but absent from the configured categories is **ignored** (FR-041). It is
not an error and does not trigger a re-ask — a removed category is not a question anybody still
needs answered.

### 4.2 Deriving the effective permission

```
isAllowed(key) = category.necessary
               ? true
               : state === 'decided' && record.a.includes(key)
```

Anything other than `decided` allows only necessary categories. This must be the single place the
question is answered — FR-038 requires the decision to be honoured on every page, and two
implementations of this expression are two chances to disagree.

---

## 5. Failure modes

| Situation | Behaviour |
| --- | --- |
| Cookies blocked entirely | The write silently does nothing; the next read finds nothing; the banner reappears on every page. It must remain fully usable and must never throw. The visitor is treated as having refused everything optional. |
| `document.cookie` throws (sandboxed iframe, hardened browser) | Caught. Same treatment as blocked cookies. |
| Value exceeds a browser's per-cookie limit | Not reachable at any plausible category count, but the write is still wrapped — a failed write must degrade to "not decided", never to a broken page. |
| `enabled` is `false` on the global | No banner is shown and **no optional category is treated as consented** (FR-026). An existing record is left untouched, so turning the banner back on restores the visitor's earlier decision rather than re-asking (US4 scenario 4). |

---

## 6. What deliberately does not exist

- **No server-side read.** `cookies()` is a request-time API; calling it in the root layout would opt
  every route on the site into dynamic rendering and cost the prerendered catalogue. The precedent is
  `src/components/layout/cart-count/cart-count.tsx`, which exists for exactly this reason.
- **No server-side consent log.** Out of scope per the spec: a record about someone who has not
  agreed to a record being created.
- **No visitor identifier.** The record says what was chosen, never by whom.
- **No script gating.** Nothing consults `isAllowed` today except the chooser's own UI, because there
  is nothing on this site to gate (FR-048, FR-051). `isAllowed` exists so that the day there is, the
  question has exactly one answer and it is already correct.
