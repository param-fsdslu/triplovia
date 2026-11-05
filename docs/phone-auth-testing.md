# Testing mobile sign-in

Firebase does not support real-number SMS phone sign-in on `localhost`. That can produce `auth/invalid-app-credential` or `auth/captcha-check-failed` even when the phone number is valid. Refreshing the page does not resolve this host restriction.

## Local testing

1. Open the **triploviia** Firebase project → **Authentication → Sign-in method → Phone**.
2. Under **Phone numbers for testing**, add a fictional E.164 number and choose its six-digit verification code. Use a fictional number, not a real customer's number.
3. On localhost, enter that test number in Login / Register. Enter the code configured in Firebase when prompted. No SMS is sent for a test number.
4. The same flow works when verifying a mobile number during email registration or profile completion. Leave Firebase verification enabled in the app; no hardcoded OTP or verification bypass is required.

## Real SMS

Use the deployed app at `https://triplovia.com`. Ensure the Phone provider is enabled, `triplovia.com` is in Firebase Authentication's authorized domains, India is allowed by the SMS region policy, and the project has the required SMS billing/quota. Frontend changes require a new Netlify deploy.

The shared OTP hook now starts the resend cooldown only after Firebase confirms the code was sent. Failed requests preserve an existing OTP confirmation and allow retrying without a misleading “Send OTP in…” countdown. Firebase still enforces its own request limits.

Reference: https://firebase.google.com/docs/auth/web/phone-auth
