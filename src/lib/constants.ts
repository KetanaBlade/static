import { GroupSettings, QuickPreset } from '../types';

export const SLOTS_PER_HOUR = 2; // 30-min increments
export const HOURS_PER_DAY = 24;
export const SLOTS_PER_DAY = HOURS_PER_DAY * SLOTS_PER_HOUR; // 48
export const DAYS_PER_WEEK = 7;
export const TOTAL_SLOTS_PER_WEEK = DAYS_PER_WEEK * SLOTS_PER_DAY; // 336

export interface DayInfo {
  index: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  name: string;
  shortName: string;
  isWeekend: boolean;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { index: 0, name: 'Monday', shortName: 'Mon', isWeekend: false },
  { index: 1, name: 'Tuesday', shortName: 'Tue', isWeekend: false },
  { index: 2, name: 'Wednesday', shortName: 'Wed', isWeekend: false },
  { index: 3, name: 'Thursday', shortName: 'Thu', isWeekend: false },
  { index: 4, name: 'Friday', shortName: 'Fri', isWeekend: false },
  { index: 5, name: 'Saturday', shortName: 'Sat', isWeekend: true },
  { index: 6, name: 'Sunday', shortName: 'Sun', isWeekend: true },
];

export const POPULAR_TIMEZONES = [
  { group: 'US & Canada', timezones: [
    { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles, Seattle, Vancouver)' },
    { value: 'America/Denver', label: 'US Mountain (Denver, Calgary, Phoenix)' },
    { value: 'America/Chicago', label: 'US Central (Chicago, Dallas, Winnipeg)' },
    { value: 'America/New_York', label: 'US Eastern (New York, Toronto, Miami)' },
    { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
  ]},
  { group: 'Europe & UK', timezones: [
    { value: 'Europe/London', label: 'UK & Ireland (London, Dublin)' },
    { value: 'Europe/Paris', label: 'Central Europe (Paris, Berlin, Rome, Madrid, Amsterdam)' },
    { value: 'Europe/Helsinki', label: 'Eastern Europe (Helsinki, Athens, Bucharest)' },
  ]},
  { group: 'Asia & Middle East', timezones: [
    { value: 'Asia/Dubai', label: 'Gulf (Dubai)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Bangkok', label: 'Indochina (Bangkok, Jakarta)' },
    { value: 'Asia/Singapore', label: 'Singapore & China (Singapore, Beijing, Hong Kong, Perth)' },
    { value: 'Asia/Tokyo', label: 'Japan & Korea (Tokyo, Seoul)' },
  ]},
  { group: 'Australia & Pacific', timezones: [
    { value: 'Australia/Sydney', label: 'Australia Eastern (Sydney, Melbourne, Brisbane)' },
    { value: 'Pacific/Auckland', label: 'New Zealand (Auckland, Wellington)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
  ]},
  { group: 'Latin America', timezones: [
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'Brazil (São Paulo, Rio)' },
    { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  ]},
];

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  timeFormat: '12h',
  weekStart: 'monday',
  minDurationMinutes: 120, // 2 hours minimum overlap default
};

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'weekend-afternoons',
    label: 'Weekend Afternoons',
    description: 'Sat & Sun 12:00 PM – 5:00 PM',
    getRanges: () => [
      { day: 5, startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 },
      { day: 6, startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 },
    ],
  },
  {
    id: 'weekend-evenings',
    label: 'Weekend Evenings',
    description: 'Fri & Sat 6:00 PM – 11:00 PM',
    getRanges: () => [
      { day: 4, startHour: 18, startMinute: 0, endHour: 23, endMinute: 0 },
      { day: 5, startHour: 18, startMinute: 0, endHour: 23, endMinute: 0 },
    ],
  },
  {
    id: 'all-weekends',
    label: 'All Weekends',
    description: 'Sat & Sun 10:00 AM – 10:00 PM',
    getRanges: () => [
      { day: 5, startHour: 10, startMinute: 0, endHour: 22, endMinute: 0 },
      { day: 6, startHour: 10, startMinute: 0, endHour: 22, endMinute: 0 },
    ],
  },
  {
    id: 'weekday-evenings',
    label: 'Weekday Evenings',
    description: 'Mon–Thu 6:00 PM – 10:00 PM',
    getRanges: () => [0, 1, 2, 3].map((day) => ({
      day,
      startHour: 18,
      startMinute: 0,
      endHour: 22,
      endMinute: 0,
    })),
  },
];
