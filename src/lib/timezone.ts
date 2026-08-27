import {
  DAYS_OF_WEEK,
  SLOTS_PER_DAY,
  SLOTS_PER_HOUR,
  TOTAL_SLOTS_PER_WEEK,
} from './constants';
import { SlotIndex, TimeRange } from '../types';

/**
 * Auto-detect user's local IANA timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns current offset in minutes for a given timezone relative to UTC.
 * Example: 'America/New_York' returns -300 or -240 depending on DST.
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
  try {
    // Format the date in UTC and in the target timezone
    const utcDateStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzDateStr = date.toLocaleString('en-US', { timeZone: timezone });
    
    const utcDate = new Date(utcDateStr);
    const tzDate = new Date(tzDateStr);
    
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * Get short timezone name / abbreviation (e.g. 'PST', 'GMT', 'JST', 'EDT')
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Converts a local (day, slot-in-day) to a UTC slot index (0..335).
 * Monday 00:00 = 0.
 * Handles negative and week-wrapping offsets cleanly with modulo arithmetic.
 */
export function localToUtcSlot(dayIndex: number, slotInDay: number, timezone: string): SlotIndex {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const offsetSlots = Math.round(offsetMinutes / 30);
  
  // Total local slot in the week (0..335)
  const localWeekSlot = (dayIndex * SLOTS_PER_DAY) + slotInDay;
  
  // UTC = Local - Offset
  const rawUtcSlot = localWeekSlot - offsetSlots;
  
  // Circular wrap across 336-slot week
  return ((rawUtcSlot % TOTAL_SLOTS_PER_WEEK) + TOTAL_SLOTS_PER_WEEK) % TOTAL_SLOTS_PER_WEEK;
}

/**
 * Converts a UTC slot index (0..335) to a local { dayIndex, slotInDay, hour, minute }
 */
export function utcToLocalSlot(
  utcSlot: SlotIndex,
  timezone: string
): {
  dayIndex: number;
  slotInDay: number;
  hour: number;
  minute: number;
  dayName: string;
} {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const offsetSlots = Math.round(offsetMinutes / 30);
  
  // Local = UTC + Offset
  const rawLocalSlot = utcSlot + offsetSlots;
  const localWeekSlot = ((rawLocalSlot % TOTAL_SLOTS_PER_WEEK) + TOTAL_SLOTS_PER_WEEK) % TOTAL_SLOTS_PER_WEEK;
  
  const dayIndex = Math.floor(localWeekSlot / SLOTS_PER_DAY);
  const slotInDay = localWeekSlot % SLOTS_PER_DAY;
  const hour = Math.floor(slotInDay / SLOTS_PER_HOUR);
  const minute = (slotInDay % SLOTS_PER_HOUR) * 30;
  const dayName = DAYS_OF_WEEK[dayIndex]?.name || 'Monday';

  return { dayIndex, slotInDay, hour, minute, dayName };
}

/**
 * Format a slot (0..47) into human-readable time string.
 * Example: slot 28 -> "2:00 PM" (12h) or "14:00" (24h)
 */
export function formatSlotTime(slotInDay: number, format: '12h' | '24h' = '12h'): string {
  const normalizedSlot = ((slotInDay % SLOTS_PER_DAY) + SLOTS_PER_DAY) % SLOTS_PER_DAY;
  const hour24 = Math.floor(normalizedSlot / SLOTS_PER_HOUR);
  const minute = (normalizedSlot % SLOTS_PER_HOUR) * 30;
  const minuteStr = minute === 0 ? '00' : '30';

  if (format === '24h') {
    const hourStr = hour24.toString().padStart(2, '0');
    return `${hourStr}:${minuteStr}`;
  }

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Converts a list of TimeRanges (e.g. from dropdowns or presets) into UTC SlotIndex array
 */
export function timeRangesToUtcSlots(ranges: TimeRange[], timezone: string): SlotIndex[] {
  const slotsSet = new Set<SlotIndex>();

  for (const range of ranges) {
    const startSlotInDay = (range.startHour * SLOTS_PER_HOUR) + (range.startMinute >= 30 ? 1 : 0);
    let endSlotInDay = (range.endHour * SLOTS_PER_HOUR) + (range.endMinute >= 30 ? 1 : 0);
    
    // If end is 24:00, cap to 48
    if (range.endHour >= 24) {
      endSlotInDay = SLOTS_PER_DAY;
    }

    for (let slot = startSlotInDay; slot < endSlotInDay; slot++) {
      const utcSlot = localToUtcSlot(range.day, slot, timezone);
      slotsSet.add(utcSlot);
    }
  }

  return Array.from(slotsSet).sort((a, b) => a - b);
}

/**
 * Converts a list of UTC slots into continuous local TimeRange blocks for a given timezone
 */
export function utcSlotsToTimeRanges(utcSlots: SlotIndex[], timezone: string): TimeRange[] {
  if (!utcSlots || utcSlots.length === 0) return [];

  // Convert each UTC slot to local { day, slotInDay }
  const localSlotsByDay = new Map<number, Set<number>>();
  for (let d = 0; d < 7; d++) {
    localSlotsByDay.set(d, new Set<number>());
  }

  for (const slot of utcSlots) {
    const { dayIndex, slotInDay } = utcToLocalSlot(slot, timezone);
    localSlotsByDay.get(dayIndex)?.add(slotInDay);
  }

  const ranges: TimeRange[] = [];

  for (let day = 0; day < 7; day++) {
    const daySlots = Array.from(localSlotsByDay.get(day) || []).sort((a, b) => a - b);
    if (daySlots.length === 0) continue;

    let startSlot = daySlots[0];
    let prevSlot = daySlots[0];

    for (let i = 1; i <= daySlots.length; i++) {
      const currentSlot = daySlots[i];
      if (currentSlot === prevSlot + 1) {
        prevSlot = currentSlot;
      } else {
        // Range ended: [startSlot, prevSlot]
        const startHour = Math.floor(startSlot / SLOTS_PER_HOUR);
        const startMinute = (startSlot % SLOTS_PER_HOUR) * 30;
        const endHour = Math.floor((prevSlot + 1) / SLOTS_PER_HOUR);
        const endMinute = ((prevSlot + 1) % SLOTS_PER_HOUR) * 30;

        ranges.push({
          day,
          startHour,
          startMinute,
          endHour,
          endMinute,
        });

        if (currentSlot !== undefined) {
          startSlot = currentSlot;
          prevSlot = currentSlot;
        }
      }
    }
  }

  return ranges;
}
