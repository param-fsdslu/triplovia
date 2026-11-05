# WhatsApp booking confirmations (Twilio)

When a hotel booking is paid, `notifyBookingConfirmed` (`lib/services/booking-notifications.service.ts`) sends, once per payment:

| To | Channel | When |
|----|---------|------|
| Guest | Email "Booking confirmed" with the tax invoice PDF(s) | Booking or account has an email |
| Guest | WhatsApp, template `guestBooking` | Guest left "Send my booking confirmation on WhatsApp" ticked (on by default) |
| Hotel | WhatsApp, template `hotelBooking` | The hotel's phone (Admin → Hotels) is a mobile number |
| Hotel | Email alert | Hotel email, else the owner's account email |

WhatsApp is skipped (and logged as `skipped`) until the Twilio variables below are set. Sending never blocks or undoes a booking.

## 1. Twilio account and sender

1. Create a Twilio account and note the **Account SID**. Create an **API key** (Console → Account → API keys & tokens, Standard key) and keep its SID (`SK…`) and secret.
2. **Testing**: Console → Messaging → Try it out → Send a WhatsApp message. Every test phone (guest and hotel) must send `join <your-code>` to `+14155238886` first, and again every 3 days. The sandbox sender is `+14155238886`. Your templates reach a sandbox phone as in-session messages (within 24 hours of its last message to the sandbox), so you can test before Meta approves them.
3. **Live**: register your own WhatsApp Business sender (Console → Messaging → Senders → WhatsApp senders) with a Meta Business account, using a number that isn't already on WhatsApp. Display name "Triplovia".

## 2. The two templates

Create both in Console → Messaging → Content Template Builder: type **Text**, language **English**, then submit for WhatsApp approval as category **Utility**. Copy each template's Content SID (`HX…`).

Meta's rules (already met below): a variable can't start or end the message, two variables can't sit side by side, and numbers run in order. The app strips line breaks from the values.

### Guest: `triplovia_booking_confirmed`

```
Hi {{1}}, your stay at {{2}} is confirmed.

Booking ID: {{3}}
Check-in: {{4}}
Check-out: {{5}}
Room(s): {{6}}
Guests: {{7}}
Total paid: {{8}}

Please show your booking ID and a photo ID at check-in. Your invoice is in your email and under My Bookings on triplovia.com.

Team Triplovia
```

| Variable | Value | Sample |
|----------|-------|--------|
| `{{1}}` | Guest first name | Asha |
| `{{2}}` | Hotel name | Demo Stay Honnavar |
| `{{3}}` | Booking ID(s) | BK-20261021-AAAA |
| `{{4}}` | Check-in date and time | Sat, 14 Nov, 2026 (from 2:00 pm) |
| `{{5}}` | Check-out date and time | Mon, 16 Nov, 2026 (until 11:00 am) |
| `{{6}}` | Rooms | Deluxe Double Room × 1 |
| `{{7}}` | Guests | 2 adults, 1 child |
| `{{8}}` | Total paid | ₹3,450 |

### Hotel: `triplovia_new_booking_hotel`

```
New booking at {{1}}, paid online through Triplovia.

Booking ID: {{2}}
Guest: {{3}}
Mobile: {{4}}
Check-in: {{5}}
Check-out: {{6}}
Room(s): {{7}}
Guests: {{8}}
Paid online: {{9}}
Special requests: {{10}}

Please have the room(s) ready. The full details are in your email.

Team Triplovia
```

| Variable | Value | Sample |
|----------|-------|--------|
| `{{1}}` | Hotel name | Demo Stay Honnavar |
| `{{2}}` | Booking ID(s) | BK-20261021-AAAA |
| `{{3}}` | Guest name | Asha Naik |
| `{{4}}` | Guest mobile ("Not given" if none) | +91 98765 43210 |
| `{{5}}` | Check-in date and time | Sat, 14 Nov, 2026 (from 2:00 pm) |
| `{{6}}` | Check-out date and time | Mon, 16 Nov, 2026 (until 11:00 am) |
| `{{7}}` | Rooms | Deluxe Double Room × 1 |
| `{{8}}` | Guests | 2 adults, 1 child |
| `{{9}}` | Amount paid | ₹3,450 |
| `{{10}}` | Special requests ("None" if empty) | Late arrival around 11 pm |

The variable order is fixed in `guestWhatsAppVariables` / `hotelWhatsAppVariables` (`lib/utils/booking-summary.ts`). If you change a template's wording, keep the numbers; if you add or reorder variables, change those functions too.

## 3. Environment variables (Netlify → Site configuration → Environment variables)

```
TWILIO_ACCOUNT_SID=AC…
TWILIO_API_KEY_SID=SK…
TWILIO_API_KEY_SECRET=…
TWILIO_WHATSAPP_FROM=+14155238886          # sandbox, or your registered sender
TWILIO_WA_GUEST_BOOKING_SID=HX…
TWILIO_WA_HOTEL_BOOKING_SID=HX…
```

`TWILIO_AUTH_TOKEN` works instead of the API key pair, but an API key can be revoked on its own. Mark the secret as secret in Netlify. These add about 250 bytes to the 4KB Lambda environment limit.

## Consent

- **Guests** opt in with the checkbox under the mobile number on the review page (`whatsapp_opt_in` on the booking). Unticked means no WhatsApp; the email still goes.
- **Hotels** get the alert on the phone number in their hotel profile, so agree it with each property as part of the partnership, and make sure that number is a mobile with WhatsApp. Landlines are skipped.
- Anyone who replies STOP is opted out by Twilio and later sends to them fail (error 21610); the booking is unaffected.

## Checking sends

Each confirmation logs one `notify` line with the result per channel, e.g. `guest WhatsApp: sent`, `hotel WhatsApp: skipped (WhatsApp is not configured)`, `guest WhatsApp: failed (…)`. Delivery status (delivered, read, failed) is in Twilio Console → Monitor → Logs → Messaging. Common errors: 63016 (sent free text outside the 24-hour window, means the template isn't approved yet), 63003 (number isn't on WhatsApp), 63015 (sandbox: the phone hasn't joined).
