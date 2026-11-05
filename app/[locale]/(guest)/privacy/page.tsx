import { LegalPage, type LegalSection } from '@/components/legal/LegalPage'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Triplovia Privacy Policy — how we collect, use, process, and protect your personal information.',
}

const SECTIONS: LegalSection[] = [
  {
    title: 'Information We Collect',
    content: (
      <>
        <p>Triplovia may collect the following types of information:</p>

        <h3>Personal Information</h3>
        <ul>
          <li>Full name</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Address details where required</li>
          <li>Government ID details where required for bookings</li>
        </ul>

        <h3>Booking Information</h3>
        <ul>
          <li>Guest names</li>
          <li>Travel dates</li>
          <li>Property preferences</li>
          <li>Special requests</li>
          <li>Passenger details</li>
        </ul>

        <h3>Payment Information</h3>
        <ul>
          <li>Transaction details</li>
          <li>Payment status</li>
          <li>Billing details</li>
        </ul>
        <p><strong>Note:</strong> Triplovia does NOT store debit/credit card numbers. Payments are processed through secure third-party payment gateways.</p>

        <h3>Technical Information</h3>
        <ul>
          <li>IP address</li>
          <li>Device information</li>
          <li>Browser type</li>
          <li>Access time</li>
          <li>Platform usage data</li>
        </ul>

        <h3>Communication Information</h3>
        <ul>
          <li>WhatsApp conversations</li>
          <li>Customer support communications</li>
          <li>Email communications</li>
        </ul>
      </>
    ),
  },
  {
    title: 'How We Use Information',
    content: (
      <>
        <p>Triplovia uses collected information for:</p>
        <ul>
          <li>Processing bookings</li>
          <li>Providing customer support</li>
          <li>Sending booking confirmations</li>
          <li>Communicating service updates</li>
          <li>Fraud prevention</li>
          <li>Legal compliance</li>
          <li>Improving platform performance</li>
          <li>Resolving disputes</li>
          <li>Sending important service notifications</li>
        </ul>
        <p>Triplovia does not sell personal information to unauthorized third parties.</p>
      </>
    ),
  },
  {
    title: 'Information Sharing',
    content: (
      <>
        <p>Triplovia may share User information only where necessary:</p>
        <ul>
          <li><strong>With Service Providers:</strong> Information required for booking fulfillment may be shared with hotels, transport operators, rental partners and activity providers.</li>
          <li><strong>With Payment Partners:</strong> Payment data may be processed by secure payment gateway providers.</li>
          <li><strong>With Government Authorities:</strong> Information may be shared if required by law or regulatory authorities.</li>
          <li><strong>With Technology Providers:</strong> Platform vendors may process limited data required for service delivery.</li>
        </ul>
        <p>Triplovia does not share personal data for marketing by third parties without User consent.</p>
      </>
    ),
  },
  {
    title: 'Data Security',
    content: (
      <>
        <p>Triplovia takes reasonable security measures to protect User data including secure access controls, limited internal data access, payment gateway encryption, and platform security practices.</p>
        <p>However, no online system is completely secure and Triplovia cannot guarantee absolute data security. Users acknowledge that information shared online is at their own risk.</p>
      </>
    ),
  },
  {
    title: 'Data Retention',
    content: (
      <>
        <p>Triplovia may retain User data for:</p>
        <ul>
          <li>Booking history records</li>
          <li>Legal compliance</li>
          <li>Tax compliance</li>
          <li>Dispute resolution</li>
          <li>Fraud prevention</li>
        </ul>
        <p>Data may be retained even after account closure where legally required.</p>
      </>
    ),
  },
  {
    title: 'User Responsibilities',
    content: (
      <p>Users are responsible for providing accurate information, protecting login credentials, not sharing OTPs, and using secure devices. Triplovia shall not be responsible for data loss due to User negligence.</p>
    ),
  },
  {
    title: 'Cookies and Tracking',
    content: (
      <p>Triplovia may use cookies or similar technologies to improve user experience, analyze platform usage, and remember user preferences. Users may disable cookies through browser settings, though some features may not function properly.</p>
    ),
  },
  {
    title: 'Third Party Links',
    content: (
      <p>The Platform may contain links to third party services. Triplovia is not responsible for privacy practices of third party websites or service providers. Users are advised to review third party privacy policies.</p>
    ),
  },
  {
    title: "Children's Privacy",
    content: (
      <p>Triplovia services are not intended for individuals below 18 years of age. We do not knowingly collect personal data from minors. If such data is discovered, Triplovia reserves the right to delete such information.</p>
    ),
  },
  {
    title: 'User Rights',
    content: (
      <p>Users may request correction of inaccurate data, update of contact details, or deletion of account where possible. Such requests may be subject to legal retention requirements.</p>
    ),
  },
  {
    title: 'Fraud Prevention',
    content: (
      <p>Triplovia may use User data to detect fraud and prevent misuse of the Platform. Accounts suspected of fraud may be restricted.</p>
    ),
  },
  {
    title: 'Policy Updates',
    content: (
      <p>Triplovia reserves the right to update this Privacy Policy at any time. Updated versions shall be effective upon publication on the Platform. Users are advised to review the policy periodically. Continued use of the Platform constitutes acceptance of updates.</p>
    ),
  },
  {
    title: 'Consent',
    content: (
      <p>By using the Platform and providing information, Users consent to data collection, data processing, data sharing for booking fulfillment, and communication related to bookings.</p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How we collect, use, process, and protect your personal information."
      intro={
        <>
          <p>This Privacy Policy describes how Triplovia (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;) collects, uses, processes and protects personal information of Users (&quot;User&quot;, &quot;you&quot;) when using the Triplovia website, booking platform and official communication channels.</p>
          <p>By using the Triplovia Platform, you agree to the collection and use of information in accordance with this Privacy Policy. For privacy related queries, contact us using the details at the end of this page.</p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
