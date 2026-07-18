/**
 * Pure late‑fee calculator – no DB, no Stripe, fully testable.
 *
 * @param {Object} rule            – row from late_fee_rules
 * @param {number} rule.gracePeriodHours
 * @param {'HOURLY'|'DAILY'} rule.rateType
 * @param {number} rule.rateAmount   – smallest currency unit (e.g. paise)
 * @param {number} rule.maxCap
 * @param {Date|string|number} actualReturnTime
 * @param {Date|string|number} rentalPeriodEnd
 * @param {number} depositHeld       – amount_held from deposits row
 * @param {number} damageDeductionAmount
 * @returns {{latePenalty:number,totalDeduction:number,refundAmount:number,lateByMinutes:number}}
 */
export function calculateLateFee(
  rule,
  actualReturnTime,
  rentalPeriodEnd,
  depositHeld,
  damageDeductionAmount
) {
  const actual = new Date(actualReturnTime).getTime();
  const end = new Date(rentalPeriodEnd).getTime();
  const lateByMinutes = Math.max(0, Math.ceil((actual - end) / 60000)); // ms → minutes, round up

  const graceMinutes = (rule?.gracePeriodHours ?? 0) * 60;
  let latePenalty = 0;

  if (lateByMinutes > graceMinutes) {
    const excessMinutes = lateByMinutes - graceMinutes;
    let units;
    if (rule.rateType === 'HOURLY') {
      // charge per started hour
      units = Math.ceil(excessMinutes / 60);
    } else {
      // DAILY – charge per started day
      units = Math.ceil(excessMinutes / 1440);
    }
    latePenalty = units * rule.rateAmount;
    if (latePenalty > rule.maxCap) latePenalty = rule.maxCap;
  }

  const totalDeduction = Math.min(latePenalty + (damageDeductionAmount ?? 0), depositHeld);
  const refundAmount = depositHeld - totalDeduction;

  return { latePenalty, totalDeduction, refundAmount, lateByMinutes };
}