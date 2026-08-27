import { describe, it, expect } from 'vitest';
import { findOverlappingWindows } from '../src/lib/overlap';
import { generateWindowDiscordMessage, getNextOccurrenceUnix } from '../src/lib/discord';
import { timeRangesToUtcSlots } from '../src/lib/timezone';
import { GroupMember, GroupSettings } from '../src/types';

describe('Overlap Engine', () => {
  const defaultSettings: GroupSettings = {
    timeFormat: '12h',
    weekStart: 'monday',
    minDurationMinutes: 60,
  };

  it('correctly calculates 100% overlap for members in LA, NY, and London', () => {
    const alexSlots = timeRangesToUtcSlots(
      [{ day: 5, startHour: 11, startMinute: 0, endHour: 15, endMinute: 0 }],
      'America/Los_Angeles'
    );
    const sarahSlots = timeRangesToUtcSlots(
      [{ day: 5, startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }],
      'America/New_York'
    );
    const seanSlots = timeRangesToUtcSlots(
      [{ day: 5, startHour: 19, startMinute: 0, endHour: 23, endMinute: 0 }],
      'Europe/London'
    );

    const members: GroupMember[] = [
      { id: '1', name: 'Alex', timezone: 'America/Los_Angeles', slotsUtc: alexSlots, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Sarah', timezone: 'America/New_York', slotsUtc: sarahSlots, createdAt: '', updatedAt: '' },
      { id: '3', name: 'Sean', timezone: 'Europe/London', slotsUtc: seanSlots, createdAt: '', updatedAt: '' },
    ];

    const windows = findOverlappingWindows(members, 'America/Los_Angeles', defaultSettings);
    expect(windows.length).toBe(1);

    const discordMsg = generateWindowDiscordMessage(windows[0]);
    expect(discordMsg).toMatch(/^\*\*Saturday:\*\* <t:\d+:t> – <t:\d+:t>$/);
  });

  it('generates a valid positive Unix timestamp in seconds for a slot', () => {
    const unix = getNextOccurrenceUnix(0);
    expect(unix).toBeGreaterThan(1700000000);
    const nowSec = Math.floor(Date.now() / 1000);
    expect(unix).toBeGreaterThan(nowSec);
  });

  it('identifies partial overlap and lists unavailable members', () => {
    const alexSlots = timeRangesToUtcSlots(
      [{ day: 5, startHour: 11, startMinute: 0, endHour: 15, endMinute: 0 }],
      'America/Los_Angeles'
    );
    const sarahSlots = timeRangesToUtcSlots(
      [{ day: 5, startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }],
      'America/New_York'
    );
    const mikeSlots = timeRangesToUtcSlots(
      [{ day: 0, startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 }],
      'America/Chicago'
    );

    const members: GroupMember[] = [
      { id: '1', name: 'Alex', timezone: 'America/Los_Angeles', slotsUtc: alexSlots, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Sarah', timezone: 'America/New_York', slotsUtc: sarahSlots, createdAt: '', updatedAt: '' },
      { id: '3', name: 'Mike', timezone: 'America/Chicago', slotsUtc: mikeSlots, createdAt: '', updatedAt: '' },
    ];

    const windows = findOverlappingWindows(members, 'America/Los_Angeles', defaultSettings);
    expect(windows.length).toBeGreaterThanOrEqual(1);
    
    const topWindow = windows[0];
    expect(topWindow.overlapCount).toBe(2);
    expect(topWindow.unavailableMemberIds).toContain('3');
  });
});
