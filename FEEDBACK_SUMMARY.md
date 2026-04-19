# Feedback System — Developer Summary

## What Was Added

### New Files
| File | Purpose |
|---|---|
| `migrations/031_create_feedback_tables.sql` | DB schema changes (see below) |
| `lib/inactivity-feedback-email.ts` | Resend email sender for inactivity emails |
| `app/api/feedback/route.ts` | `GET` popup status · `POST` submit feedback |
| `app/api/feedback/dismiss/route.ts` | `POST` mark popup dismissed |
| `app/api/activity/route.ts` | `POST` record last activity timestamp |
| `app/api/cron/inactivity-email/route.ts` | Daily cron handler — sends inactivity emails |
| `components/feedback-popup.tsx` | Premium bottom-right popup component |
| `app/feedback/page.tsx` | Standalone branded feedback page (email CTA destination) |
| `vercel.json` | Vercel Cron schedule (10:00 UTC daily) |

### Modified Files
| File | Change |
|---|---|
| `components/dashboard-client.tsx` | Added `FeedbackPopup`, activity ping on mount, feedback status check on mount + after each generation |

---

## Database Changes

Run `migrations/031_create_feedback_tables.sql` against your Supabase project.

### Columns added to `profiles`
| Column | Type | Purpose |
|---|---|---|
| `last_activity_at` | `TIMESTAMPTZ` | Updated on every meaningful product action |
| `inactivity_email_sent_at` | `TIMESTAMPTZ` | Timestamp of last inactivity email sent |
| `feedback_popup_shown_at` | `TIMESTAMPTZ` | (Reserved — currently set via API when popup shown) |
| `feedback_popup_dismissed_at` | `TIMESTAMPTZ` | Set when user closes popup without submitting |
| `feedback_submitted_at` | `TIMESTAMPTZ` | Set after successful feedback submission |

### New table: `user_feedback`
Stores all submitted feedback for developer review.

```sql
id            UUID PRIMARY KEY
user_id       UUID → auth.users
email         TEXT
source        TEXT  -- 'popup' | 'inactive_email'
feedback_text TEXT
submitted_at  TIMESTAMPTZ
metadata      JSONB
```

**To review feedback:**
```sql
SELECT submitted_at, source, email, feedback_text
FROM user_feedback
ORDER BY submitted_at DESC;
```

---

## Environment Variables Required

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | ✅ Already set | Used for inactivity emails and forwarding to support |
| `CRON_SECRET` | ✅ Add in Vercel | Any random string — protects the cron endpoint from unauthorized calls |
| `NEXT_PUBLIC_APP_URL` | ✅ Add if not set | e.g. `https://www.smartreplypro.ai` — used to build the feedback URL in emails |

---

## How the Inactivity Email Works

1. **Scheduling**: `vercel.json` configures Vercel Cron to call `GET /api/cron/inactivity-email` daily at **10:00 UTC**.
2. **Auth**: The cron endpoint checks `Authorization: Bearer <CRON_SECRET>`. Vercel Cron automatically sends this header when `CRON_SECRET` is set in environment variables.
3. **Eligibility query**: Users qualify if:
   - `last_activity_at < NOW() - 4 days`
   - `feedback_submitted_at IS NULL` (skip users who already gave feedback)
   - `email IS NOT NULL`
   - `inactivity_email_sent_at IS NULL` OR `inactivity_email_sent_at < last_activity_at` (prevents duplicate emails; supports new inactivity cycles)
4. **After sending**: `inactivity_email_sent_at` is updated — the user won't receive another email unless they become active again and then go inactive for another 4-day stretch.
5. **Batch limit**: 50 users per run (prevents memory issues on free tier; increase `BATCH_SIZE` in the route if needed).

> **Deployment note**: Vercel Cron is available on Hobby plan and above. The `vercel.json` `crons` key is only respected when deployed to Vercel. For local testing, call `GET /api/cron/inactivity-email` with the `Authorization: Bearer <your-secret>` header manually.

---

## How the Feedback Popup Works

1. On dashboard mount: `GET /api/feedback/status` is called.
2. After each successful generation: the same status endpoint is re-checked.
3. Status endpoint counts rows in `replies` table for the user. If `count >= 5` and the user hasn't dismissed or submitted, `showPopup: true` is returned.
4. Popup renders in the bottom-right corner (`components/feedback-popup.tsx`).
5. **Dismiss**: closes the popup and calls `POST /api/feedback/dismiss` → sets `feedback_popup_dismissed_at` → never shows again.
6. **Submit**: `POST /api/feedback` → stores in `user_feedback`, sets `feedback_submitted_at`, and forwards to `support@smartreplypro.ai` via Resend.

---

## How to Review Feedback Later

**In Supabase Dashboard:**
```sql
SELECT
  uf.submitted_at,
  uf.source,
  uf.email,
  uf.feedback_text,
  p.username
FROM user_feedback uf
LEFT JOIN profiles p ON p.id = uf.user_id
ORDER BY uf.submitted_at DESC;
```

**Via Resend:** All feedback is also forwarded to `support@smartreplypro.ai` with the user's email as `reply_to`, so you can reply directly from your inbox.
