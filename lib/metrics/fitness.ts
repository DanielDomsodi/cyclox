/**
 * Training metrics calculation utilities with continuous daily calculations
 */

import { lightFormat } from 'date-fns';

export interface TrainingMetrics {
  ctl: number; // Chronic Training Load (Fitness)
  atl: number; // Acute Training Load (Fatigue)
  tsb: number; // Training Stress Balance (Form)
  date?: Date; // Date associated with these metrics
}

export interface TrainingConstants {
  ctlDays: number; // Time constant for CTL (typically 42 days)
  atlDays: number; // Time constant for ATL (typically 7 days)
}

// Default constants
export const DEFAULT_TRAINING_CONSTANTS: TrainingConstants = {
  ctlDays: 42,
  atlDays: 7,
};

// Default precision for rounding
const DEFAULT_PRECISION = 1;

/**
 * Calculates a single day's training metrics using exponential weighting
 * @param trainingLoadToday - Training Stress Score for the day (0 for rest days)
 * @param previousMetrics - Previous day's CTL, ATL, and TSB values
 * @param constants - Time constants for CTL and ATL calculations
 * @param precision - Decimal precision for rounding results
 * @returns Updated training metrics
 */
export function calculateDailyMetrics(
  trainingLoadToday: number,
  previousMetrics: TrainingMetrics,
  constants: TrainingConstants = DEFAULT_TRAINING_CONSTANTS,
  precision: number = DEFAULT_PRECISION
): TrainingMetrics {
  // True exponential weighting formula
  const ctlDecay = Math.exp(-1 / constants.ctlDays);
  const atlDecay = Math.exp(-1 / constants.atlDays);

  const newCtl =
    previousMetrics.ctl * ctlDecay + trainingLoadToday * (1 - ctlDecay);
  const newAtl =
    previousMetrics.atl * atlDecay + trainingLoadToday * (1 - atlDecay);

  // Calculate TSB
  const newTsb = newCtl - newAtl;

  // Round to specified precision
  const factor = Math.pow(10, precision);

  return {
    ctl: Math.round(newCtl * factor) / factor,
    atl: Math.round(newAtl * factor) / factor,
    tsb: Math.round(newTsb * factor) / factor,
  };
}

/**
 * Initializes training metrics with baseline values
 */
export function initializeTrainingMetrics(
  initialTrainingLoad: number = 0
): TrainingMetrics {
  return {
    ctl: initialTrainingLoad,
    atl: initialTrainingLoad,
    tsb: 0,
  };
}

/**
 * Calculates training metrics for a date range with activity data
 * Ensures every day in the range is calculated, even days with no activities
 *
 * @param activities - Array of activities with dates and TSS values
 * @param startDate - First date to calculate metrics for
 * @param endDate - Last date to calculate metrics for (defaults to current date)
 * @param initialMetrics - Starting metrics to use (required if startDate has no previous data)
 * @param constants - Training constants to use
 * @returns Map of dates to training metrics, with every day in the range included
 */
export function calculateContinuousMetrics(
  activities: { date: Date; trainingLoad: number | null }[],
  startDate: Date,
  endDate: Date = new Date(),
  initialMetrics: TrainingMetrics,
  constants: TrainingConstants = DEFAULT_TRAINING_CONSTANTS
): Map<string, TrainingMetrics> {
  // Create a normalized map of dates to TSS values
  const trainingLoadMap = new Map<string, number>();

  // Fill the tssMap with activities
  activities.forEach((activity) => {
    const dateString = lightFormat(activity.date, 'yyyy-MM-dd');
    const currentTrainingLoad = trainingLoadMap.get(dateString) || 0;
    const activityTrainingLoad = activity.trainingLoad || 0;
    trainingLoadMap.set(dateString, currentTrainingLoad + activityTrainingLoad);
  });

  // Create result map to store metrics for each day
  const metricsMap = new Map<string, TrainingMetrics>();

  // Clone dates to avoid modifying the original objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set end dates to midnight to ensure correct day comparisons
  end.setHours(23, 59, 59, 999);

  // Initialize the current metrics with the provided initial metrics
  let currentMetrics = { ...initialMetrics };

  // Iterate through each day in the range
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateString = lightFormat(currentDate, 'yyyy-MM-dd');

    // Get TSS for the current day (0 if no activity)
    const dailyTrainingLoad = trainingLoadMap.get(dateString) || 0;

    // Calculate metrics for this day
    currentMetrics = calculateDailyMetrics(
      dailyTrainingLoad,
      currentMetrics,
      constants
    );

    // Store with date
    metricsMap.set(dateString, {
      ...currentMetrics,
      date: new Date(currentDate),
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return metricsMap;
}

/**
 * For convenience: Get metrics for a specific date from the metrics map
 */
export function getMetricsForDate(
  metricsMap: Map<string, TrainingMetrics>,
  date: Date
): TrainingMetrics | undefined {
  const dateString = lightFormat(date, 'yyyy-MM-dd');
  return metricsMap.get(dateString);
}

/**
 * For convenience: Export metrics as an array sorted by date
 */
export function getMetricsArray(
  metricsMap: Map<string, TrainingMetrics>
): TrainingMetrics[] {
  return Array.from(metricsMap.values()).sort(
    (a, b) => a.date!.getTime() - b.date!.getTime()
  );
}

/**
 * Calculate Acute to Chronic Workload Ratio (ACWR)
 *
 * ACWR represents the ratio between short-term training load (acute/fatigue)
 * and long-term training load (chronic/fitness).
 *
 * Interpretation:
 * - 0.80-1.30: Optimal workload and lowest relative injury risk (safe zone)
 * - 1.50+: Overloading and highest relative injury risk
 *
 * @param atl - Acute workload (fatigue) value
 * @param ctl - Chronic workload (fitness) value
 * @returns ACWR value or null if inputs are invalid
 */
export function calculateACWR(
  atl: number | null,
  ctl: number | null
): number | null {
  // Handle invalid cases
  if (atl === null || ctl === null) {
    return null;
  }

  // Avoid division by zero or very small values
  if (ctl <= 0.001) {
    return null;
  }

  // Calculate the ratio
  const acwr = atl / ctl;

  return acwr;
}

/**
 * Get the risk level category based on ACWR value
 *
 * @param acwr - Acute to Chronic Workload Ratio
 * @returns A string indicating the risk level
 */
export function getACWRRiskLevel(
  acwr: number | null
): 'low' | 'moderate' | 'high' | 'unknown' {
  if (acwr === null) {
    return 'unknown';
  }

  if (acwr >= 0.8 && acwr <= 1.3) {
    return 'low'; // Safe zone
  } else if (acwr > 1.3 && acwr < 1.5) {
    return 'moderate'; // Increased risk
  } else if (acwr >= 1.5) {
    return 'high'; // High risk
  } else {
    return 'low'; // Below 0.8 is generally safe (undertraining)
  }
}
