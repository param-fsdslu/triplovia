'use client'

export function ResendOtpButton({ resendIn, busy, onResend }: { resendIn: number; busy: boolean; onResend: () => void }) {
  return <p className="text-center text-sm text-muted-foreground">
    Didn&apos;t get the code?{' '}
    <button type="button" onClick={onResend} disabled={busy || resendIn > 0} className="font-semibold text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline">
      {resendIn > 0 ? <span className="tabular-nums">Resend OTP in {resendIn}s</span> : 'Resend OTP'}
    </button>
  </p>
}
