import ModernResetPasswordForm from '@/components/auth/ModernResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex flex-1 flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ModernResetPasswordForm />
      </div>
    </div>
  )
}
