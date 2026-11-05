import { CancellationPolicyMatrix } from '@/components/hotel/CancellationPolicyMatrix'
import { LegalPage, type LegalSection } from '@/components/legal/LegalPage'

export const metadata = {
  title: 'Cancellation & Refund Policy',
  description: 'Triplovia Cancellation and Refund Policy — cancellation terms, refund eligibility, gateway fee, and processing timelines.',
}

const SECTIONS: LegalSection[] = [
  {
    title: 'Hotel Cancellation Policies',
    content: <div className="space-y-6">
      <p>Each hotel selects one policy, shown on its hotel page and at checkout. The policy saved with your booking determines your refund; later hotel changes do not alter existing bookings.</p>
      <CancellationPolicyMatrix policy="flexible" vendorTerms={false} />
      <CancellationPolicyMatrix policy="moderate" vendorTerms={false} />
      <CancellationPolicyMatrix policy="strict" />
    </div>,
  },
  {
    title: 'Existing Bookings and Payment Gateway Fees',
    content: <p>Bookings made under the previous 48-hour policy retain those terms: cancellation at least 48 hours before check-in qualifies for a refund minus the 2.36% gateway fee; later cancellations and no-shows receive no refund. No gateway fee is deducted for bookings made under the Flexible, Moderate or Strict hotel matrix. Boat bookings retain the cancellation window and gateway-fee terms shown when booked.</p>,
  },
  {
    title: 'Boat & Activity Booking Cancellation',
    content: (
      <>
        <p>Boat and activity bookings are subject to the following terms:</p>
        <ul>
          <li>Cancellations made before the free cancellation deadline specified for the trip type: eligible for refund minus the gateway fee deduction.</li>
          <li>Cancellations made within the restricted window or after the trip date: no refund applicable.</li>
          <li>The free cancellation period per trip type is displayed at the time of booking and on the booking confirmation.</li>
          <li>Weather-based rescheduling, if offered, is at the sole discretion of the boat operator and does not entitle the User to a cash refund.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cancellation Process',
    content: (
      <>
        <p>To cancel a booking, the User must:</p>
        <ul>
          <li>Log in to their Triplovia account and navigate to their booking.</li>
          <li>Initiate the cancellation through the booking management section.</li>
          <li>Alternatively, contact Triplovia support via email or phone with the booking reference number.</li>
        </ul>
        <p>Cancellation is considered effective only after confirmation is received from Triplovia. Verbal or informal requests shall not constitute valid cancellations.</p>
      </>
    ),
  },
  {
    title: 'Refund Review and Approval Process',
    content: (
      <>
        <p>All customer-initiated refund requests go through an internal review process before being dispatched to the payment gateway:</p>
        <ol>
          <li><strong>Submission:</strong> The User submits a cancellation. The booking is immediately marked as cancelled and a refund request is raised.</li>
          <li><strong>Confirmation email:</strong> The User receives an acknowledgement email confirming that the cancellation has been received and the refund request is under review.</li>
          <li><strong>Admin review:</strong> Triplovia reviews the request to verify eligibility based on cancellation timing and booking conditions. This typically occurs within 1–2 business days.</li>
          <li><strong>Processing:</strong> If approved, the eligible refund amount (under the policy saved with the booking) is submitted to Razorpay for processing.</li>
          <li><strong>Credit to User:</strong> The refund is credited to the original payment method within the timelines stated below.</li>
        </ol>
        <p>If a refund request is rejected (e.g., cancellation is outside the eligible window or fraud is suspected), the User shall be notified by email with the reason for rejection.</p>
      </>
    ),
  },
  {
    title: 'Refund Processing Timeline',
    content: (
      <>
        <p>Once approved and submitted to the payment gateway, refunds are credited within:</p>
        <ul>
          <li><strong>5–7 business days</strong> for UPI payments</li>
          <li><strong>5–7 business days</strong> for net banking payments</li>
          <li><strong>7–10 business days</strong> for debit and credit card payments</li>
        </ul>
        <p>These timelines are governed by Razorpay and the User&apos;s bank. Triplovia is not responsible for delays caused by the payment gateway or the issuing bank after the refund has been submitted.</p>
      </>
    ),
  },
  {
    title: 'Non-Refundable Components',
    content: (
      <>
        <p>For guest-initiated cancellations, the following restrictions apply under the policy saved with the booking:</p>
        <ul>
          <li>Gateway fees only where the original booking terms specify a deduction (legacy hotel and boat bookings)</li>
          <li>Any additional flat cancellation charges introduced and disclosed at time of booking</li>
          <li>Bookings cancelled within the restricted window shown in the saved policy</li>
          <li>No-show bookings</li>
          <li>Bookings where the check-in or trip date has already passed</li>
          <li>Bookings explicitly marked non-refundable at the time of booking</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Refund Mode',
    content: (
      <p>Refunds are credited exclusively to the original payment method used at the time of booking. Triplovia does not offer cash refunds or transfers to a different payment method or bank account. The refund amount will reflect in the same UPI ID, bank account, or card used for the original transaction.</p>
    ),
  },
  {
    title: 'Partial Refunds',
    content: (
      <p>The Moderate hotel policy refunds 50% when cancelled less than 72 hours and at least 24 hours before check-in. Legacy hotel and boat bookings may have gateway-fee deductions under their original terms.</p>
    ),
  },
  {
    title: 'No Show Policy',
    content: (
      <p>If the User fails to check in or participate in the booked activity without prior cancellation, the booking shall be treated as a no-show. No refund shall be applicable for no-show bookings. The full booking amount is forfeited.</p>
    ),
  },
  {
    title: 'Admin-Initiated Cancellations',
    content: (
      <p>Triplovia reserves the right to cancel any booking at its discretion in circumstances including but not limited to: pricing errors, payment authorization failures, fraudulent transactions, overbooking by the service provider, or force majeure events. For vendor-initiated hotel cancellations, the Vendor must refund 100% of any advance within 48 hours and pay Triplovia the full commission due on the booking.</p>
    ),
  },
  {
    title: 'Force Majeure',
    content: (
      <p>In the event of force majeure (natural disasters, government restrictions, pandemics, or events beyond reasonable control), Triplovia shall endeavour to facilitate rescheduling or refunds as per the service provider&apos;s applicable policy. Triplovia shall not be liable beyond facilitating such arrangements.</p>
    ),
  },
  {
    title: 'Fraudulent Refund Claims',
    content: (
      <p>Triplovia reserves the right to deny refund requests and permanently restrict account access if fraudulent cancellation or refund claims are detected. Triplovia may share information with law enforcement if required.</p>
    ),
  },
  {
    title: 'Dispute Resolution',
    content: (
      <p>If the User disputes a refund decision, they must contact Triplovia support within 7 days of receiving the refund decision. Triplovia shall attempt to resolve the dispute on a best-effort basis. Final refund decisions are subject to verification of booking details, cancellation timing, and payment gateway records.</p>
    ),
  },
  {
    title: 'Policy Updates',
    content: (
      <p>Triplovia reserves the right to modify this Cancellation and Refund Policy at any time. Changes shall take effect from the date of publication on the Platform. Bookings made before the change shall be governed by the policy in effect at the time of booking.</p>
    ),
  },
]

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      description="Understand our cancellation terms, refund eligibility, gateway fee deduction, and processing timelines."
      intro={
        <p>This Cancellation and Refund Policy governs cancellations and refunds for bookings made through Triplovia. By making a booking, the User agrees to the cancellation and refund terms stated below and as displayed at the time of booking. For cancellations and refunds, contact us using the details at the end of this page.</p>
      }
      sections={SECTIONS}
    />
  )
}
