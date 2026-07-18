/**
 * Pure cancellation refund calculator – no DB, no Stripe, fully testable.
 *
 * @param {Object} policy          – row from cancellation_policies
 * @param {number} policy.full_refund_hours_before
 * @param {number} policy.partial_refund_hours_before
 * @param {number} policy.partial_refund_percent   (0‑100)
 * @param {Date|string|number} rentalPeriodStart   – ISO timestamp when rental begins
 * @param {number} rentalFeeCents                  – total rental fee in smallest currency unit
 * @param {number} depositCents                    – total deposit held
 * @returns {{refundPercent:number, rentalRefundCents:number, depositRefundCents:number, hoursUntilStart:number}}
 */
export function calculateCancellationRefund(
  policy,
  rentalPeriodStart,
  rentalFeeCents,
  depositCents
) {
  const now = Date.now();
  const start = new Date(rentalPeriodStart).getTime();
  const hoursUntilStart = (start - now) / 3_600_000; // ms → hours (can be fractional)

  let refundPercent;
  if (hoursUntilStart >= policy.full_refund_hours_before) {
    refundPercent = 100;
  } else if (hoursUntilStart >= policy.partial_refund_hours_before) {
    refundPercent = policy.partial_refund_percent;
  } else {
    refundPercent = 0;
  }

  const rentalRefundCents = Math.round((rentalFeeCents * refundPercent) / 100);
  // Deposit is always fully refunded on cancellation per contract
  const depositRefundCents = depositCents;

  return {
    refundPercent,
    rentalRefundCents,
    depositRefundCents,
    hoursUntilStart: Number(hoursUntilStart.toFixed(2)),
  };
}