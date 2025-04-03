/**
 * Calculates the calories burned during a cycling session.
 *
 * @param {number} averagePower - The average power output in watts.
 * @param {number} duration - The duration of the cycling session in seconds.
 * @returns {number} The estimated calories burned.
 *
 * @remarks
 * The calculation is based on the formula:
 *
 * \[
 * \text{Calories} = \frac{\text{Work (in Joules)}}{\text{Energy Conversion Factor (in Joules per Calorie)} \times \text{Human Efficiency}}
 * \]
 *
 * Where:
 * - Work is calculated as `averagePower * duration` (in Joules).
 * - Energy Conversion Factor is 4184 Joules per Calorie (since 1 Calorie = 4184 Joules).
 * - Human Efficiency in cycling is approximately 0.24 (24%).
 */
export function calculateCalories(
  duration: number,
  averagePower?: number | null
) {
  if (!averagePower || averagePower === 0) return 0;
  const work = averagePower * duration;
  return Math.floor(work / (4184 * 0.24));
}
