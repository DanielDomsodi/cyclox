/**
 * Calculate Normalized Power (NP) from a power data array
 *
 * NP represents the metabolic cost of a variable power output by
 * applying a specific algorithm to the raw power data.
 *
 * @param powerData - Array of power values in watts
 * @param sampleRate - Sampling rate in seconds (default: 1 second)
 * @returns Normalized Power value or null if insufficient data
 */
export function calculateNP(
  powerData: (number | null)[],
  sampleRate: number = 1
): number | null {
  // Need at least 30 seconds of data for a valid calculation
  if (!powerData || powerData.length < 30 / sampleRate) {
    return null;
  }

  // 1. Calculate 30-second moving average
  const windowSize = Math.round(30 / sampleRate);
  const movingAvg: number[] = [];

  for (let i = 0; i <= powerData.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += powerData[i + j] || 0;
    }
    movingAvg.push(sum / windowSize);
  }

  // 2. Raise each value to the 4th power
  const raised = movingAvg.map((p) => Math.pow(p, 4));

  // 3. Calculate average of the raised values
  const average = raised.reduce((sum, val) => sum + val, 0) / raised.length;

  // 4. Take the 4th root of the average
  return Math.pow(average, 0.25);
}

/**
 * Calculate Intensity Factor (IF) for a workout
 *
 * IF measures the intensity of a workout relative to the athlete's FTP
 *
 * @param normalizedPower - Normalized Power value in watts
 * @param ftp - Functional Threshold Power in watts
 * @returns Intensity Factor as a decimal (1.0 = 100% of FTP)
 */
export function calculateIF(normalizedPower: number, ftp: number): number {
  if (!normalizedPower || !ftp || ftp <= 0) {
    return 0;
  }
  return normalizedPower / ftp;
}

/**
 * Calculate Training Stress Score (TSS) for a workout
 *
 * TSS quantifies the overall training load of a workout
 *
 * @param normalizedPower - Normalized Power in watts
 * @param durationSeconds - Duration in seconds
 * @param ftp - Functional Threshold Power in watts
 * @returns TSS value
 */
export function calculateTSS(
  normalizedPower: number,
  durationSeconds: number,
  ftp: number
): number {
  if (!normalizedPower || !durationSeconds || !ftp || ftp <= 0) {
    return 0;
  }

  // IF squared × hours × 100
  const intensityFactor = calculateIF(normalizedPower, ftp);
  const hours = durationSeconds / 3600;

  return intensityFactor * intensityFactor * hours * 100;
}

/**
 * Calculate Variability Index (VI)
 *
 * VI is the ratio of Normalized Power to Average Power
 *
 * @param normalizedPower - Normalized Power in watts
 * @param averagePower - Average Power in watts
 * @returns Variability Index as a decimal
 */
export function calculateVI(
  normalizedPower: number,
  averagePower: number
): number {
  if (!normalizedPower || !averagePower || averagePower <= 0) {
    return 0;
  }
  return normalizedPower / averagePower;
}

/**
 * Estimate FTP from a known effort
 *
 * @param power - Power output in watts
 * @param durationMinutes - Duration in minutes
 * @returns Estimated FTP
 */
export function estimateFTP(power: number, durationMinutes: number): number {
  if (!power || !durationMinutes) {
    return 0;
  }

  // Common estimation factors
  if (durationMinutes >= 55 && durationMinutes <= 65) {
    // 1-hour power is approximately 95% of FTP
    return power / 0.95;
  } else if (durationMinutes >= 18 && durationMinutes <= 22) {
    // 20-minute power is approximately 105% of FTP
    return power * 0.95;
  } else if (durationMinutes >= 4.5 && durationMinutes <= 5.5) {
    // 5-minute power is approximately 150% of FTP
    return power / 1.5;
  }

  // Default fallback using Andrew Coggan's model
  // FTP ≈ mMP × (durationMinutes^-0.07)
  return power * Math.pow(durationMinutes, -0.07);
}
