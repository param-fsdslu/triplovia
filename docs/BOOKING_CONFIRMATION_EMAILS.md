# Booking confirmation emails

Customer and vendor receive separate emails only after successful hotel payment (verify or Razorpay webhook). Multi-room payments are grouped into one customer email and one vendor email. BookingService no longer emails a confirmation before payment.

## Formats

Customer preview: [customer-confirmation.html](email-previews/customer-confirmation.html). Vendor preview: [vendor-confirmation.html](email-previews/vendor-confirmation.html). Both contain example data only; generating them does not send email.

Customer: reference(s), hotel/address, check-in/out with times, guest name/mobile, rooms, nights, guest counts, paid total, meal plans, special requests, saved cancellation terms, GST details when requested, booking-management link. Tax invoice PDFs are attached when available; if rendering fails or the set exceeds the outbox size budget, download invoices from the booking page.

Vendor: reference(s), guest name/mobile/email, stay dates/times, rooms, nights, guest counts, payment total, meal plans, special requests, GST request, saved cancellation terms, and a direct panel link using the booking reference.

## Recipients

Customer: booking guest_email, falling back to the signed-in account email. Vendor: hotels.email, falling back to hotels.owner_id account email. Mobile-only guests without an email cannot receive an email; this is logged. Keep the hotel's email configured in Edit Hotel.

## Netlify

Deploy the site normally. Set RESEND_API_KEY, EMAIL_FROM (verified sender domain), NEXT_PUBLIC_APP_URL (public production URL) and CRON_SECRET in Netlify environment variables available to Functions. Existing Firebase server credentials are also required. Netlify supplies URL. No credential is committed by this change.

netlify/functions/booking-confirmations.mjs runs every five minutes on published production deploys and calls the fail-closed CRON_SECRET-protected /api/cron/booking-confirmations endpoint. The endpoint processes at most five outstanding payment groups from the last 24 hours per run. Immediate payment success remains the normal trigger; cron is recovery. In Netlify Functions, use Run now to check after deployment. Do not run live email tests against real recipients without authorization.

## Delivery safety

Each customer/vendor delivery has its own _booking_emails document, frozen payload, two-minute transactional lease and stable Resend idempotency key. Successful channels are not resent if another channel fails. Pending sends retry; after 23 hours from the first attempt they become needs_attention rather than exceeding Resend's 24-hour idempotency window. Old run-once claims are respected to avoid replaying pre-upgrade confirmations. _booking_confirmation_runs tracks the new flow. Firestore rules already deny all direct browser access to these internal collections. These records include guest data: restrict server access and handle retention with booking records.

confirmation_sent_at is set after all available email recipients have succeeded (missing email addresses are logged and skipped). It records provider acceptance, not inbox delivery. WhatsApp remains independently best-effort and respects the existing opt-in.

Checks: npm run test:email; npm run test:db; npx tsc --noEmit. Deployment and live delivery are separate from local tests.
