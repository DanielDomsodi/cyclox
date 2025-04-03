export type StravaActivityStreamType =
  | 'time'
  | 'distance'
  | 'latlng'
  | 'altitude'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'watts'
  | 'temp'
  | 'moving'
  | 'grade_smooth';

export interface StravaActivityStreamParams {
  keys: StravaActivityStreamType[];
  key_by_type?: boolean;
}

export interface StravaActivitiesParams {
  before?: number;
  after?: number;
  page?: number;
  per_page?: number;
}

export interface StravaActivityParams {
  include_all_efforts?: boolean;
}
