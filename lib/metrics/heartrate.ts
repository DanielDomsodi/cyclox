/**
 * Calculate Training Impulse (TRIMP) using Banister's original formula
 *
 * @param avgHR - Average heart rate for the activity
 * @param restHR - Resting heart rate
 * @param maxHR - Maximum heart rate
 * @param durationMinutes - Duration in minutes
 * @param gender - 'male' or 'female'
 * @returns TRIMP value
 */
export function calculateTRIMP(
  avgHR: number,
  restHR: number,
  maxHR: number,
  durationMinutes: number,
  gender: 'male' | 'female'
): number {
  if (!avgHR || !restHR || !maxHR || !durationMinutes) {
    return 0;
  }

  // Heart rate ratio
  const hrRatio = (avgHR - restHR) / (maxHR - restHR);

  // Gender-specific weighting factor
  const y = gender === 'male' ? 1.92 : 1.67;

  // Time in minutes × HRratio × 0.64e^(1.92 × HRratio) - for men
  // Time in minutes × HRratio × 0.86e^(1.67 × HRratio) - for women
  const weightingFactor = gender === 'male' ? 0.64 : 0.86;

  return durationMinutes * hrRatio * weightingFactor * Math.exp(y * hrRatio);
}

/**
 * Calculate heart rate based TSS (hrTSS)
 *
 * @param avgHR - Average heart rate
 * @param thresholdHR - Threshold heart rate (typically at lactate threshold)
 * @param durationHours - Duration in hours
 * @returns Heart rate based TSS
 */
export function calculateHrTSS(
  avgHR: number,
  thresholdHR: number,
  durationHours: number
): number {
  if (!avgHR || !thresholdHR || !durationHours || thresholdHR <= 0) {
    return 0;
  }

  const hrRatio = avgHR / thresholdHR;
  const intensity = Math.pow(hrRatio, 1.8); // Exponential relationship

  return intensity * intensity * durationHours * 100;
}
