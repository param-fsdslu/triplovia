-- Lets an admin edit the final refund amount (capped at what the customer paid)
-- while keeping an audit trail of the original calculated amount and who changed it.
-- Run this in the Supabase SQL editor before deploying the app changes that use it.

ALTER TABLE "public"."refund_transactions"
  ADD COLUMN IF NOT EXISTS "calculated_refund_amount" numeric(10,2),
  ADD COLUMN IF NOT EXISTS "amount_edited_by" "uuid",
  ADD COLUMN IF NOT EXISTS "amount_edit_reason" "text";

COMMENT ON COLUMN "public"."refund_transactions"."calculated_refund_amount" IS
  'The policy-calculated refund amount before any admin override. refund_amount is the final amount actually refunded.';
COMMENT ON COLUMN "public"."refund_transactions"."amount_edited_by" IS
  'auth.users id of the admin who overrode refund_amount away from calculated_refund_amount, if any.';
COMMENT ON COLUMN "public"."refund_transactions"."amount_edit_reason" IS
  'Reason given for overriding the refund amount, if any.';
