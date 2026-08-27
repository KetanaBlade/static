import { describe, it, expect } from 'vitest';
import {
  formatSlotTime,
  localToUtcSlot,
  timeRangesToUtcSlots,
  utcSlotsToTimeRanges,
  utcToLocalSlot,
} from '../src/lib/timezone';
import { TOTAL_SLOTS_PER_WEEK } from '../src/lib/constants';

describe('Timezone Engine', () => {
  it('correctly maps 12h and 24h slot times', () => {
    expect(formatSlotTime(0, '12h')).toBe('12:00 AM');
    expect(formatSlotTime(0, '24h')).toBe('00:00');
    expect(formatSlotTime(24, '12h')).toBe('12:00 PM');
    expect(formatSlotTime(24, '24h')).toBe('12:00');
    expect(formatSlotTime(29, '12h')).toBe('2:30 PM');
    expect(formatSlotTime(29, '24h')).toBe('14:30');
    expect(formatSlotTime(47, '12h')).toBe('11:30 PM');
    expect(formatSlotTime(47, '24h')).toBe('23:30');
  });

  it('preserves bijection on localToUtcSlot and utcToLocalSlot roundtrips across timezones', () => {
    const timezones = [
      'UTC',
      'America/Los_Angeles',
      'America/Chicago',
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];

    timezones.forEach((tz) => {
      for (let day = 0; day < 7; day++) {
        for (let slot = 0; slot < 48; slot += 4) {
          const utcSlot = localToUtcSlot(day, slot, tz);
          expect(utcSlot).toBeGreaterThanOrEqual(0);
          expect(utcSlot).toBeLessThan(TOTAL_SLOTS_PER_WEEK);

          const local = utcToLocalSlot(utcSlot, tz);
          expect(local.dayIndex).toBe(day);
          expect(local.slotInDay).toBe(slot);
        }
      }
    });
  });

  it('accurately converts time ranges to UTC slots and back', () => {
    const tz = 'America/New_York';
    const ranges = [
      { day: 5, startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }, // Saturday 2pm-6pm
    ];

    const utcSlots = timeRangesToUtcSlots(ranges, tz);
    expect(utcSlots.length).toBe(8); // 4 hours * 2 slots/hour = 8 slots

    const reconstructedRanges = utcSlotsToTimeRanges(utcSlots, tz);
    expect(reconstructedRanges.length).toBe(1);
    expect(reconstructedRanges[0]).toEqual({
      day: 5,
      startHour: 14,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
    });
  });
});
