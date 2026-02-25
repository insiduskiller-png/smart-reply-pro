# Launch Testing Guide (Local)

## STEP 1 — Run project

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

---

## STEP 2 — Create account

1. Go to: `http://localhost:3000/login`
2. Create a new account in Supabase Auth (via your signup flow or Supabase dashboard if needed).
3. Log in with email + password.
4. Verify login succeeds and dashboard is accessible.

---

## STEP 3 — Password reset

1. On login page, use **Forgot password**.
2. Check email for reset link.
3. Open reset link and verify it lands in reset-password flow.
4. Set a new password.
5. Verify redirect back to login.
6. Verify login works with the new password.

---

## STEP 4 — AI generation test

1. Go to dashboard.
2. Enter an incoming message.
3. Click **Generate**.
4. Verify at least one output appears.
5. Verify OpenAI API is responding (no API error shown).

---

## STEP 5 — Power Score test

1. Ensure account is Pro (or upgrade first).
2. Click **Power score**.
3. Verify Power Score result appears with score + leverage details.

---

## STEP 6 — Stripe test

1. Go to: `http://localhost:3000/pricing`
2. Click **Upgrade to Pro**.
3. Verify Stripe Checkout opens.
4. Use test card:
   - `4242 4242 4242 4242`
   - Any future date
   - Any CVC
   - Any ZIP/postcode
5. Complete payment.
6. Verify success redirect works.
7. Verify webhook updates user and account becomes Pro.
