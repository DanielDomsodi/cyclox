import { formatYYYYMMDD, getDateRange, getYesterday } from '../utils/date';

export type CronJobName = 'daily-fitness';
export type CronJobConfig = {
  endpoint: string;
  getParams: () => Record<string, unknown>;
};

export const cronJobs: Record<CronJobName, CronJobConfig> = {
  'daily-fitness': {
    endpoint: '/api/cron/sync-fitness',
    getParams: () => {
      const yesterday = getYesterday(new Date());

      const nextWeekRange = getDateRange(7);

      return {
        after_date: formatYYYYMMDD(yesterday),
        before_date: formatYYYYMMDD(nextWeekRange.endDate),
      };
    },
  },
};
