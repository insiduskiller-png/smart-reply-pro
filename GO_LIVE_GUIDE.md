# Go Live Guide (Stripe)

## Step 1 — Switch from TEST mode to LIVE mode

In Stripe Dashboard, toggle from **Test mode** to **Live mode**.

## Step 2 — Copy live keys

Collect live credentials:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`

## Step 3 — Update environment variables

Update your deployment environment (and optionally `.env.local` for local live testing) with live keys.

## Step 4 — Restart server / redeploy

- Local: restart `npm run dev`
- Hosted: redeploy app so new variables are applied

## Important difference

- **Test mode** = fake money/test cards
- **Live mode** = real customer charges and real payouts
