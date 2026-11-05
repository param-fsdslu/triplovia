import { LegalPage, type LegalSection } from '@/components/legal/LegalPage'

export const metadata = {
  title: 'Terms & Conditions',
  description: 'Triplovia Terms and Conditions — User Agreement governing use of services, bookings, and platform.',
}

const SECTIONS: LegalSection[] = [
  {
    title: 'Applicability of User Agreement',
    content: (
      <>
        <p>This User Agreement along with the applicable Terms of Service (collectively referred to as the &quot;Agreement&quot;) governs the use of services, products and booking facilitation platform operated by Triplovia, a partnership firm registered in India (hereinafter referred to as &quot;Triplovia&quot;).</p>
        <p>Any person who accesses, browses, registers, makes inquiries or purchases any services offered by Triplovia shall be referred to as the &quot;User&quot; and shall be bound by this Agreement.</p>
        <p>Triplovia provides an online technology platform enabling Users to search, compare and book travel related services including but not limited to hotels, resorts, homestays, cab services, bike rentals and boating experiences (collectively referred to as &quot;Services&quot;).</p>
        <p>This Agreement applies to all bookings and interactions made through:</p>
        <ul>
          <li>Triplovia website</li>
          <li>Official WhatsApp communication channels</li>
          <li>Customer support communication</li>
          <li>Official Triplovia booking confirmations</li>
          <li>Any other authorized digital communication channel of Triplovia</li>
        </ul>
        <p>(All collectively referred to as &quot;Sales Channels&quot;). The Triplovia website and digital communication platforms shall collectively be referred to as the &quot;Platform&quot;.</p>
        <p>Triplovia operates solely as a technology intermediary and booking facilitator connecting Users with independent service providers. Triplovia does not own, operate or control hotels, transport services, rental vehicles or activity providers listed on the Platform unless explicitly stated.</p>
        <p>The contract of service for any booking shall be strictly between the User and the respective service provider. Triplovia shall only facilitate the transaction.</p>
        <p>For the purpose of this Agreement:</p>
        <ul>
          <li>&quot;User&quot; means any individual accessing or using the Platform.</li>
          <li>&quot;Service Provider&quot; means any hotel, property owner, transport operator, rental partner or activity operator providing services through Triplovia.</li>
          <li>&quot;Platform&quot; means the Triplovia website and official communication channels.</li>
          <li>&quot;Party&quot; shall individually refer to either the User or Triplovia and collectively referred to as &quot;Parties&quot;.</li>
        </ul>
        <p>By using the Platform, the User confirms that:</p>
        <ul>
          <li>They have read and understood this Agreement</li>
          <li>They agree to be legally bound by these terms</li>
          <li>They will comply with service provider policies</li>
          <li>Information provided is accurate</li>
        </ul>
        <p>If the User does not agree to these Terms, the User must discontinue use of the Platform immediately.</p>
        <p>Triplovia reserves the right to modify this Agreement at any time. Continued use of the Platform after modification shall constitute acceptance of the updated terms.</p>
        <p>This Agreement shall be governed by the applicable laws of India.</p>
      </>
    ),
  },
  {
    title: 'Eligibility',
    content: (
      <>
        <p>The User must be at least 18 years of age and must possess the legal authority and capacity to enter into a legally binding agreement under the applicable laws of India in order to register on the Platform and use the services of Triplovia.</p>
        <p>By registering an account on Triplovia, the User confirms that:</p>
        <ul>
          <li>They are at least 18 years old</li>
          <li>They have the legal capacity to contract</li>
          <li>All information provided is true and accurate</li>
          <li>They will use the Platform only for lawful purposes</li>
        </ul>
        <p>If a person is below 18 years of age (minor), such person shall not register on the Platform or make any bookings. Any use of the Platform by a minor may only be done through a parent or legal guardian who shall be responsible for all activities performed through the account.</p>
        <p>Triplovia reserves the right to suspend, terminate or restrict access to any User account without prior notice if it is discovered that the User is a minor, false information was provided, the User does not have legal capacity to contract, the account is being misused, or any fraudulent activity is suspected.</p>
        <p>User registration is mandatory before making any booking on Triplovia. The User shall be responsible for maintaining confidentiality of their login credentials including OTP verification and account access.</p>
      </>
    ),
  },
  {
    title: 'Role of Triplovia',
    content: (
      <>
        <p>Triplovia operates as an online technology platform that facilitates bookings between Users and independent service providers including hotels, homestays, transport operators, bike rental providers and activity operators.</p>
        <p>Triplovia acts solely as an intermediary and booking facilitator and does not own, control, manage, operate or provide any of the services listed on the Platform unless explicitly stated.</p>
        <p>Triplovia&apos;s responsibility is limited to: providing the technology platform, facilitating bookings, processing payments where applicable, and providing booking confirmation.</p>
        <p>Triplovia shall not be responsible for: quality of accommodation or services, service standard or maintenance, safety conditions at properties or vehicles, acts or omissions of service providers, accidents or incidents during service usage, overbooking by service providers, denial of service by suppliers, delays or cancellations by providers, behavior of hotel staff, drivers or operators, or any injury, loss, damage or inconvenience suffered by the User.</p>
        <p>The maximum liability of Triplovia in any circumstance shall be limited to the total booking amount paid by the User for the specific booking in dispute.</p>
      </>
    ),
  },
  {
    title: 'Hotel Bookings',
    content: (
      <>
        <p>Triplovia acts only as a facilitator providing an online platform for Users to search and book accommodation services offered by independent hotels, homestays, resorts, guesthouses and similar properties (collectively referred to as &quot;Properties&quot;).</p>
        <p>All information displayed on the Platform including property descriptions, images, amenities, facilities, policies, pricing and availability is provided by the respective Properties. Triplovia does not independently verify such information.</p>

        <h3>4.1. User Responsibilities for Hotel Bookings</h3>
        <p>The User must carry valid government identification at check-in, follow property rules and policies, maintain proper conduct during stay, and pay for damages caused to property.</p>
        <p>The Property reserves the right to deny check-in if valid ID is not provided, User fails to meet age requirements, property policies are violated, local ID restrictions apply, unmarried couple policies apply, or maximum occupancy limits are exceeded.</p>

        <h3>4.2. Hotel Policies and Check-in Terms</h3>
        <p>Check-in and check-out times shall be as defined by the Property. Early check-in and late check-out are subject to availability and may involve additional charges payable directly to the Property.</p>

        <h3>4.3. Child Policy and Occupancy Rules</h3>
        <p>Child accommodation policies are determined by individual Properties. For pricing and occupancy purposes, the following general classification may apply unless otherwise specified:</p>
        <ul>
          <li>0-5 years: Infant</li>
          <li>6-11 years: Child</li>
          <li>12 years and above: Adult</li>
        </ul>

        <h3>4.4. Additional Charges by the Property</h3>
        <p>The booking amount paid through Triplovia covers only the services confirmed during booking. Additional charges including extra meals, room service, laundry, telephone usage, mini bar usage, parking, security deposits, extra bed charges, and festival surcharges shall be payable directly to the Property unless specifically included in the booking.</p>

        <h3>4.5. Payment Terms for Hotel Bookings</h3>
        <p>Hotel bookings may be classified as prepaid bookings, pay at property bookings, or part payment bookings (where applicable). Service fees charged by Triplovia are non-refundable unless explicitly stated.</p>

        <h3>4.6. No Show and Cancellation</h3>
        <p>If the User fails to check-in on the booking date (&quot;No Show&quot;), the booking is treated as a within-window cancellation and no refund shall be applicable. Hotels offer Flexible, Moderate or Strict cancellation policies, displayed before booking and saved with the booking. Eligible refunds under these policies are exactly 100% or 50%, without a gateway-fee deduction. Existing bookings retain their original terms. For full details, see our <a href="/refund-policy">Cancellation &amp; Refund Policy</a>.</p>
      </>
    ),
  },
  {
    title: 'Cab Bookings',
    content: (
      <>
        <p>Triplovia provides an online platform enabling Users to book cab services offered by independent cab operators (&quot;Cab Operators&quot;). Triplovia does not own, operate or control any cab services and shall not be considered a transport provider.</p>
        <p>The contract of transportation service exists solely between the User and the Cab Operator. Triplovia&apos;s role is limited to facilitating the booking and providing booking confirmation.</p>
      </>
    ),
  },
  {
    title: 'Bike Rental Terms',
    content: (
      <>
        <p>Triplovia provides an online platform that enables Users to book bike rental services offered by independent rental providers (&quot;Rental Partners&quot;). The rental agreement exists solely between the User and the Rental Partner.</p>
        <p>Users must be at least 18 years of age, possess a valid driving license, carry original license during pickup, and provide identification proof if required.</p>
      </>
    ),
  },
  {
    title: 'Backwater Boating Terms',
    content: (
      <>
        <p>Triplovia provides an online platform enabling Users to discover and book boating and water activity experiences operated by independent activity providers (&quot;Boat Operators&quot;).</p>
        <p>The User understands that boating and water activities involve inherent risks including slipping hazards, water accidents, drowning risks, weather risks, and equipment failures. By booking a boating activity, the User voluntarily accepts these risks.</p>
        <p>Users must follow all safety instructions provided by the Boat Operator including wearing safety equipment, not engaging in unsafe behavior, and following capacity limits.</p>
        <p>Each boat trip type carries its own free cancellation window displayed at the time of booking. Cancellations made before this deadline are eligible for a refund minus the gateway fee deduction. Cancellations made within the restricted window, after the trip date, or no-shows are non-refundable. Weather-based rescheduling is at the Boat Operator&apos;s discretion and does not entitle the User to a cash refund.</p>
      </>
    ),
  },
  {
    title: 'Payment Terms',
    content: (
      <>
        <p>Bookings made through Triplovia may follow one of the following payment models: prepaid booking (full payment at time of booking), partial payment (advance with balance payable to service provider), or pay at service provider.</p>
        <p>The total booking price may include base service price, government taxes, Triplovia service fee, add-on services, applicable GST, and convenience charges where applicable.</p>
        <p>All payments shall be processed in Indian Rupees (INR) through Razorpay, a third-party payment gateway. Triplovia currently provides services only within India.</p>

        <h3>8.1. Payment Gateway Fee on Cancellations</h3>
        <p>Razorpay levies a transaction processing fee at the time of payment capture. This fee is not reversed by Razorpay when a refund is issued. Accordingly, all eligible refunds shall be subject to a deduction of approximately 2.36% of the booking amount (comprising 2% Razorpay transaction fee plus 18% GST on that fee). This deduction applies regardless of how early the cancellation is made. For detailed examples and timelines, see our <a href="/refund-policy">Cancellation &amp; Refund Policy</a>.</p>

        <h3>8.2. Refund Process</h3>
        <p>All customer-initiated cancellation refunds go through an internal admin review process before being submitted to the payment gateway. Approved refunds are credited to the User&apos;s original payment method within 5–10 business days depending on the payment method, subject to Razorpay and bank processing times.</p>
      </>
    ),
  },
  {
    title: 'Limitation of Liability',
    content: (
      <>
        <p>Triplovia acts only as a technology platform and booking facilitator. Users expressly acknowledge that Triplovia shall not be liable for any acts, errors, omissions, representations, warranties, breaches or negligence of any service provider.</p>
        <p>In no event shall Triplovia be liable for any damages exceeding the total booking amount paid by the User for the specific booking giving rise to the claim.</p>
      </>
    ),
  },
  {
    title: 'Indemnification',
    content: (
      <p>The User agrees to indemnify, defend and hold harmless Triplovia, its partners, employees, affiliates, service providers and representatives from any claims arising out of User violation of this Agreement, applicable laws, misconduct during service usage, damage caused to property, or fraudulent use of the Platform.</p>
    ),
  },
  {
    title: 'User Conduct',
    content: (
      <>
        <p>By using the Triplovia Platform, the User agrees to use the services only for lawful purposes and in compliance with this Agreement and applicable laws.</p>
        <p>The User agrees not to provide false or misleading information, make fraudulent bookings, use the Platform for unlawful activities, attempt unauthorized access, misuse promotional offers, or engage in abusive behavior towards service providers.</p>
      </>
    ),
  },
  {
    title: 'Fraud Warning and Security Notice',
    content: (
      <>
        <p>Triplovia communicates with Users only through official channels. Users are advised to exercise caution against fraudulent calls, messages, emails or websites claiming to represent Triplovia.</p>
        <p>Triplovia shall never request OTP details, banking passwords, debit or credit card PIN, UPI PIN, or personal banking credentials. Users must never share such confidential information with anyone.</p>
      </>
    ),
  },
  {
    title: 'Force Majeure',
    content: (
      <p>Triplovia shall not be liable for any failure, delay or inability to perform its obligations if caused by events beyond its reasonable control including natural disasters, government restrictions, lockdowns, pandemics, strikes, civil disturbances, war, transport disruptions, or technical failures.</p>
    ),
  },
  {
    title: 'Right to Cancel Bookings',
    content: (
      <p>Triplovia reserves the right to cancel any booking at its sole discretion in circumstances including pricing errors, incorrect inventory information, fraudulent transactions, suspected misuse, payment authorization failure, or force majeure events.</p>
    ),
  },
  {
    title: 'Modification of Terms',
    content: (
      <p>Triplovia reserves the right to modify, update or revise this User Agreement at any time without prior notice. The updated Terms shall become effective immediately upon being published on the Platform.</p>
    ),
  },
  {
    title: 'Governing Law and Jurisdiction',
    content: (
      <p>This Agreement shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts of India.</p>
    ),
  },
  {
    title: 'Privacy and Data Usage',
    content: (
      <p>By using the Platform, the User agrees that Triplovia may collect and use personal information for processing bookings, customer support, service communication, legal compliance, and fraud prevention. For details, see our <a href="/privacy">Privacy Policy</a>.</p>
    ),
  },
  {
    title: 'Right to Refuse Service',
    content: (
      <p>Triplovia reserves the right to refuse service or bookings to any User at its sole discretion in cases including suspected fraud, misconduct, abuse of policies, legal violations, or safety concerns.</p>
    ),
  },
  {
    title: 'Severability',
    content: (
      <p>If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall remain valid and enforceable.</p>
    ),
  },
  {
    title: 'Entire Agreement',
    content: (
      <p>This Agreement constitutes the complete understanding between the User and Triplovia regarding Platform usage and supersedes any prior communications or representations.</p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="Please read these terms carefully before using the Triplovia platform."
      sections={SECTIONS}
    />
  )
}
