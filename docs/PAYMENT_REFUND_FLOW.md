# Payment & Refund Transaction Flow

> **Audience:** Client / stakeholder overview of all money-related operations on Triplovia.
> Generated: 2026-04-12

---

## Payment Flow

```mermaid
flowchart TD
    subgraph PAY["💳 Payment Flow"]
        direction TB
        P1([Customer selects room / boat trip]) --> P2[Booking created\nstatus: pending]
        P2 --> P3[Customer clicks Pay Now]
        P3 --> P4["API: Create Razorpay Order\n⚠ Amount pulled from database\nnever trusted from browser"]
        P4 --> P5[Razorpay checkout\nmodal opens]
        P5 --> P6{Customer action}

        P6 -->|Pays successfully| P7["API: Verify Payment\n① HMAC signature check\n② Amount cross-checked via Razorpay API\n③ Idempotency check"]
        P6 -->|Closes / fails| P8[Booking stays pending\nNo money deducted]

        P7 -->|Valid| P9["Booking confirmed ✓\npayment_status: paid\nbooking_status: confirmed"]
        P7 -->|Invalid signature\nor amount mismatch| P10[❌ Rejected\nBooking not confirmed]

        P9 --> P11[Payment record saved]
        P9 --> P12[Receipt email → customer]

        P11 -. "Backup: Razorpay fires\npayment.captured webhook\nif verify call was missed" .-> WB1
    end

    subgraph WB["🔔 Webhook Safety Net — Payment"]
        direction TB
        WB1[payment.captured received] --> WB2{Payment record\nalready exists?}
        WB2 -->|Yes — skip| WB3[Idempotent · no action]
        WB2 -->|No — verify missed| WB4[Confirm booking\nCreate payment record\nSend receipt email]
    end
```

---

## Refund Flow

```mermaid
flowchart TD
    subgraph REF["🔄 Refund Flow"]
        direction TB
        RF1([Customer requests cancellation]) --> RF2{Pre-checks}

        RF2 -->|Already cancelled| RF_E1[❌ Already cancelled]
        RF2 -->|Payment not paid| RF_E2[❌ Nothing to refund]
        RF2 -->|Payment older than 6 months| RF_E3[❌ Bank limit exceeded\nRazorpay cannot refund]
        RF2 -->|All checks pass| RF3{Hours until\ncheckin / trip?}

        RF3 -->|"< 48 hours"| RF4["❌ No refund\n100% cancellation charge\n(within policy window)"]
        RF3 -->|"≥ 48 hours"| RF5["Refund amount calculated\n= Total paid\n− Gateway fee ~2.36%\n(non-refundable Razorpay cost)"]

        RF5 --> RF6["Booking updated\nbooking_status: cancelled\npayment_status: refund_requested"]
        RF6 --> RF7["Refund record created\nstatus: pending_approval"]
        RF7 --> RF8[📧 Email to customer\nCancellation confirmed · Refund under review]
    end

    subgraph ADMIN["👤 Admin Panel · /admin/refunds"]
        direction TB
        RF7 --> ADM1([Super admin reviews request])
        ADM1 --> ADM2{Decision}

        ADM2 -->|Reject| ADM_R1["Booking: refund_rejected\nRecord: rejected"]
        ADM_R1 --> ADM_R2[📧 Email to customer\nRefund rejected + reason]

        ADM2 -->|Approve| ADM3["Atomic lock\npending_approval → processing\nprevents double-click race"]
        ADM3 --> ADM4["Razorpay refund API called\nspeed: optimum"]

        ADM4 --> ADM5{Instant refund\npossible?}
        ADM5 -->|"Yes · card / UPI / netbanking"| ADM6["✅ Money credited\nwithin minutes"]
        ADM5 -->|"No · method not supported"| ADM7["✅ Money credited\n5–7 business days\nInstant fee auto-waived by Razorpay"]

        ADM6 --> ADM8
        ADM7 --> ADM8["Booking: refunded / partially_refunded\nRecord: processing"]
        ADM8 --> ADM9[📧 Email to customer\nRefund approved]
    end

    subgraph WBR["🔔 Webhook Safety Net — Refund"]
        direction TB
        ADM8 -. "Razorpay fires webhook\nonce money is settled" .-> WBR1

        WBR1[refund.processed received] --> WBR2["Refund record: completed ✓\nBooking payment_status confirmed"]

        WBR3[refund.failed received] --> WBR4["Refund record: failed\nAdmin notified to retry"]

        WBR5[refund.speed_changed received] --> WBR6["Logged: instant downgraded to normal\n5–7 day timeline applies"]
    end
```

---

## Payment Status Reference

```mermaid
flowchart LR
    S1["⬜ pending\nBooking created, not yet paid"]
    S2["🟢 paid\nPayment verified and confirmed"]
    S3["🔴 failed\nPayment attempt failed"]
    S4["🟡 refund_requested\nCustomer cancelled · awaiting admin review"]
    S5["🔴 refund_rejected\nAdmin declined the refund request"]
    S6["🔵 partially_refunded\nRefund sent minus gateway fee ~2.36%"]
    S7["🔵 refunded\nFull refund sent to customer"]

    S1 --> S2
    S1 --> S3
    S2 --> S4
    S4 --> S5
    S4 --> S6
    S4 --> S7
```

---

## Key Rules

| Rule | Detail |
|------|--------|
| **Amount source** | Always fetched from the database — never trusted from the browser |
| **Signature verification** | Every payment verified with HMAC SHA-256 before confirming |
| **Admin approval required** | No refund is processed automatically — super admin must approve |
| **hotel_admin cannot action refunds** | Only `super_admin` / `admin` role sees Approve / Reject |
| **48-hour cancellation window** | Cancellations ≥ 48 h before check-in/trip get a refund minus gateway fee |
| **Gateway fee ~2.36%** | Razorpay's processing cost — non-refundable from the bank, always deducted |
| **6-month hard limit** | Razorpay / banks cannot process refunds on payments older than 6 months |
| **Instant vs normal speed** | `optimum` speed tries instant first; auto-falls back to 5–7 days if unavailable. Fee is waived on fallback. |
| **Idempotency** | Both payment verify and admin approval are protected against double-processing |
| **Webhook safety net** | `payment.captured` and `refund.processed` webhooks act as a backup in case API calls are missed |
