/**
 * Represents a 30-minute time slot index across a 168-hour week (0..335).
 * Slot 0 is Monday 00:00 UTC, Slot 335 is Sunday 23:30 UTC.
 */
export type SlotIndex = number;

export interface TimeRange {
  day: number; // 0 = Monday, ..., 6 = Sunday (or 0 = Sunday if configured)
  startHour: number; // 0..23
  startMinute: number; // 0 or 30
  endHour: number; // 0..24
  endMinute: number; // 0 or 30
}

export interface GroupMember {
  id: string;
  name: string;
  timezone: string; // IANA string (e.g. 'America/Los_Angeles', 'Europe/Dublin')
  slotsUtc: SlotIndex[]; // Array of unique active 30-min slot indices in UTC
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface GroupSettings {
  timeFormat: '12h' | '24h';
  weekStart: 'monday' | 'sunday';
  minDurationMinutes: number; // e.g. 60 (1 hour), 120 (2 hours)
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorToken?: string; // Stored in localStorage on creator's device for admin capabilities
  members: GroupMember[];
  settings: GroupSettings;
  createdAt: string;
  updatedAt: string;
}

export interface MemberTimeBreakdown {
  memberId: string;
  memberName: string;
  timezone: string;
  dayName: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
}

export interface OverlappingWindow {
  id: string;
  dayOfWeek: number; // 0..6 in viewer's local timezone
  dayName: string; // "Saturday", "Sunday", etc.
  startSlotLocal: number; // local day slot index
  endSlotLocal: number; // local day slot index (exclusive)
  startTimeFormatted: string; // e.g. "11:00 AM" or "11:00"
  endTimeFormatted: string; // e.g. "3:00 PM" or "15:00"
  durationMinutes: number; // e.g. 180 (3 hours)
  overlapCount: number; // e.g. 4
  totalMembers: number; // e.g. 4
  overlapRatio: number; // e.g. 1.0 (100%) or 0.75 (75%)
  availableMemberIds: string[];
  unavailableMemberIds: string[];
  utcSlots: SlotIndex[];
  memberBreakdowns: MemberTimeBreakdown[];
}

export interface QuickPreset {
  id: string;
  label: string;
  description: string;
  icon?: string;
  getRanges: () => TimeRange[];
}
