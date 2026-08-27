import { describe, it, expect } from 'vitest';
import { computeHeatmapMatrix, findOverlappingWindows } from '../src/lib/overlap';
import { timeRangesToUtcSlots } from '../src/lib/timezone';
import { GroupMember, GroupSettings } from '../src/types';

describe('Overlap Engine', () => {
  const defaultSettings: GroupSettings = {
    timeFormat: '12h',
    weekStart: 'monday',
    minDurationMinutes: 60,
  };

  it('correctly calculates 100% overlap for members in LA, NY, and London', () => {
    // 3 friends:
    // Alex in Los Angeles: Saturday 11am-3pm (local)
    // Sarah in New York: Saturday 2pm-6pm (local) - simultaneous!
    // Sean in London: Saturday 7pm-11pm (local) - simultaneous!
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

    // They should have identical UTC slots!
    expect(alexSlots).toEqual(sarahSlots);
    expect(alexSlots).toEqual(seanSlots);

    const members: GroupMember[] = [
      { id: '1', name: 'Alex', timezone: 'America/Los_Angeles', slotsUtc: alexSlots, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Sarah', timezone: 'America/New_York', slotsUtc: sarahSlots, createdAt: '', updatedAt: '' },
      { id: '3', name: 'Sean', timezone: 'Europe/London', slotsUtc: seanSlots, createdAt: '', updatedAt: '' },
    ];

    const matrix = computeHeatmapMatrix(members);
    const activeSlots = matrix.filter((s) => s.count > 0);
    expect(activeSlots.length).toBe(8); // 4 hours = 8 slots
    expect(activeSlots.every((s) => s.count === 3 && s.ratio === 1.0)).toBe(true);

    // Viewer in London views the windows
    const windowsInLondon = findOverlappingWindows(members, 'Europe/London', defaultSettings);
    expect(windowsInLondon.length).toBe(1);
    expect(windowsInLondon[0].dayName).toBe('Saturday');
    expect(windowsInLondon[0].startTimeFormatted).toBe('7:00 PM');
    expect(windowsInLondon[0].endTimeFormatted).toBe('11:00 PM');
    expect(windowsInLondon[0].overlapCount).toBe(3);
    expect(windowsInLondon[0].overlapRatio).toBe(1);

    // Viewer in Los Angeles views the windows
    const windowsInLA = findOverlappingWindows(members, 'America/Los_Angeles', defaultSettings);
    expect(windowsInLA.length).toBe(1);
    expect(windowsInLA[0].dayName).toBe('Saturday');
    expect(windowsInLA[0].startTimeFormatted).toBe('11:00 AM');
    expect(windowsInLA[0].endTimeFormatted).toBe('3:00 PM');
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
    // Mike has no overlap
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
    
    // Top window has 2 of 3 members
    const topWindow = windows[0];
    expect(topWindow.overlapCount).toBe(2);
    expect(topWindow.unavailableMemberIds).toContain('3');
  });
});
