import { Card } from '@/components/ui/card';
import clsx from 'clsx';

export type TrainingLoadRatioProps = {
  acwr: number;
};

type TrainingLoadZone = 'low' | 'optimal' | 'high' | 'veryHigh';

const acwrThresholds = {
  low: 0.8,
  optimal: 1.2,
  high: 1.5,
  veryHigh: 2.0,
} satisfies Record<TrainingLoadZone, number>;

const acwrZoneConfig = {
  low: {
    threshold: acwrThresholds.low,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
    width: (acwrThresholds.low / 2) * 100,
  },
  optimal: {
    threshold: acwrThresholds.optimal,
    color: 'text-teal-400',
    bgColor: 'bg-teal-400',
    width: ((acwrThresholds.optimal - acwrThresholds.low) / 2) * 100,
  },
  high: {
    threshold: acwrThresholds.high,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400',
    width: ((acwrThresholds.high - acwrThresholds.optimal) / 2) * 100,
  },
  veryHigh: {
    threshold: acwrThresholds.veryHigh,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500',
    width: ((acwrThresholds.veryHigh - acwrThresholds.high) / 2) * 100,
  },
} satisfies Record<
  TrainingLoadZone,
  {
    threshold: number;
    color: string;
    bgColor: string;
    width: number;
  }
>;

function getAcwrZone(acwr: number) {
  if (acwr < 0.8) {
    return 'low';
  } else if (acwr >= acwrThresholds.low && acwr <= acwrThresholds.optimal) {
    return 'optimal';
  } else if (acwr > acwrThresholds.optimal && acwr <= acwrThresholds.high) {
    return 'high';
  } else {
    return 'veryHigh';
  }
}

export async function TrainingLoadRatio(props: TrainingLoadRatioProps) {
  const { acwr } = props;
  const acwrZone = getAcwrZone(acwr);

  return (
    <Card className="w-full p-4">
      <div className="flex justify-between">
        <h2 className="text-muted-foreground">Training load ratio</h2>
        <span className={clsx('font-bold', acwrZoneConfig[acwrZone].color)}>
          {acwr}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-3 w-full flex-nowrap items-center">
          {Object.entries(acwrZoneConfig).map(([zone, config]) => (
            <div
              key={zone}
              aria-hidden="true"
              className={clsx(
                'h-full',
                config.bgColor,
                zone === 'low' ? 'rounded-l-full' : '',
                zone === 'veryHigh' ? 'rounded-r-full' : ''
              )}
              style={{ width: `${config.width}%` }}
            ></div>
          ))}
          <div
            className={clsx(
              'absolute z-10 max-h-[18px] min-h-[18px] max-w-[18px] min-w-[18px] rounded-full border-[3px] border-white shadow-sm shadow-black/20',
              acwrZoneConfig[acwrZone].bgColor
            )}
            style={{ left: `${(acwr / acwrThresholds.veryHigh) * 100}%` }}
          ></div>
        </div>
        <span
          className={clsx(
            'text-center text-sm font-semibold',
            acwrZoneConfig[acwrZone].color
          )}
        >
          {acwrZone}
        </span>
      </div>
    </Card>
  );
}
