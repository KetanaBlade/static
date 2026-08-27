import {
  DAYS_OF_WEEK,
  SLOTS_PER_DAY,
  TOTAL_SLOTS_PER_WEEK,
} from './constants';
import {
  formatSlotTime,
  getTimezoneAbbreviation,
  utcToLocalSlot,
} from './timezone';
import {
  GroupMember,
  GroupSettings,
  MemberTimeBreakdown,
  OverlappingWindow,
  SlotIndex,
} from '../types';

export interface SlotAvailability {
  utcSlot: SlotIndex;
  count: number;
  total: number;
  ratio: number;
  availableMembers: GroupMember[];
  unavailableMembers: GroupMember[];
}

/**
 * Computes the raw availability count and member lists for all 336 UTC slots
 */
export function computeHeatmapMatrix(members: GroupMember[]): SlotAvailability[] {
  const matrix: SlotAvailability[] = [];
  const total = members.length;

  for (let slot = 0; slot < TOTAL_SLOTS_PER_WEEK; slot++) {
    const availableMembers: GroupMember[] = [];
    const unavailableMembers: GroupMember[] = [];

    for (const member of members) {
      if (member.slotsUtc && member.slotsUtc.includes(slot)) {
        availableMembers.push(member);
      } else {
        unavailableMembers.push(member);
      }
    }

    matrix.push({
      utcSlot: slot,
      count: availableMembers.length,
      total,
      ratio: total > 0 ? availableMembers.length / total : 0,
      availableMembers,
      unavailableMembers,
    });
  }

  return matrix;
}

/**
 * Generates the multi-member timezone breakdown for a contiguous set of UTC slots
 */
export function buildMemberBreakdowns(
  utcSlots: SlotIndex[],
  members: GroupMember[],
  timeFormat: '12h' | '24h' = '12h'
): MemberTimeBreakdown[] {
  if (utcSlots.length === 0) return [];

  const startUtcSlot = utcSlots[0];
  const endUtcSlot = utcSlots[utcSlots.length - 1] + 1; // exclusive

  return members.map((member) => {
    const startLocal = utcToLocalSlot(startUtcSlot, member.timezone);
    const endLocal = utcToLocalSlot(endUtcSlot, member.timezone);
    const tzAbbr = getTimezoneAbbreviation(member.timezone);

    const startTimeFormatted = formatSlotTime(startLocal.slotInDay, timeFormat);
    const endTimeFormatted = formatSlotTime(endLocal.slotInDay, timeFormat);

    return {
      memberId: member.id,
      memberName: member.name,
      timezone: tzAbbr,
      dayName: startLocal.dayName,
      startTimeFormatted,
      endTimeFormatted,
    };
  });
}

/**
 * Aggregates contiguous blocks of overlap into structured OverlappingWindow objects,
 * ranked by overlap ratio and duration.
 */
export function findOverlappingWindows(
  members: GroupMember[],
  viewerTimezone: string,
  settings: GroupSettings
): OverlappingWindow[] {
  if (members.length === 0) return [];

  const matrix = computeHeatmapMatrix(members);
  const totalMembers = members.length;
  const minDurationSlots = Math.max(1, Math.floor(settings.minDurationMinutes / 30));

  // First convert all UTC slots to viewer's local slots (0..335 in viewer week)
  const localSlotData: (SlotAvailability & { localDay: number; localSlotInDay: number })[] = [];

  for (let localWeekSlot = 0; localWeekSlot < TOTAL_SLOTS_PER_WEEK; localWeekSlot++) {
    const localDay = Math.floor(localWeekSlot / SLOTS_PER_DAY);
    const localSlotInDay = localWeekSlot % SLOTS_PER_DAY;
    
    // Find corresponding UTC slot for this local slot
    // Local = UTC + Offset => UTC = Local - Offset
    // Using utcToLocalSlot inverse lookup or direct math
    const testDate = new Date();
    const utcOffsetMinutes = Math.round(
      (new Date(testDate.toLocaleString('en-US', { timeZone: viewerTimezone })).getTime() -
       new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) / 60000
    );
    const offsetSlots = Math.round(utcOffsetMinutes / 30);
    const utcSlot = (((localWeekSlot - offsetSlots) % TOTAL_SLOTS_PER_WEEK) + TOTAL_SLOTS_PER_WEEK) % TOTAL_SLOTS_PER_WEEK;

    const data = matrix[utcSlot];
    localSlotData.push({
      ...data,
      localDay,
      localSlotInDay,
    });
  }

  // Find contiguous blocks with consistent overlap counts (>= 50% participation)
  const windows: OverlappingWindow[] = [];
  const minRequiredCount = Math.max(1, Math.ceil(totalMembers * 0.5)); // At least 50% or 1 member

  let currentBlock: (typeof localSlotData[0])[] = [];
  let currentCount = 0;

  function pushCurrentBlock() {
    if (currentBlock.length >= minDurationSlots) {
      const first = currentBlock[0];
      const last = currentBlock[currentBlock.length - 1];
      const startSlotLocal = first.localSlotInDay;
      const endSlotLocal = last.localSlotInDay + 1;
      const durationMinutes = currentBlock.length * 30;
      const dayOfWeek = first.localDay;
      const dayName = DAYS_OF_WEEK[dayOfWeek]?.name || 'Unknown';

      const startTimeFormatted = formatSlotTime(startSlotLocal, settings.timeFormat);
      const endTimeFormatted = formatSlotTime(endSlotLocal, settings.timeFormat);

      const utcSlots = currentBlock.map((b) => b.utcSlot);
      const availableMemberIds = Array.from(
        new Set(currentBlock.flatMap((b) => b.availableMembers.map((m) => m.id)))
      );
      const unavailableMemberIds = members
        .filter((m) => !availableMemberIds.includes(m.id))
        .map((m) => m.id);

      const memberBreakdowns = buildMemberBreakdowns(utcSlots, members, settings.timeFormat);

      windows.push({
        id: `window-${dayOfWeek}-${startSlotLocal}-${endSlotLocal}-${currentCount}`,
        dayOfWeek,
        dayName,
        startSlotLocal,
        endSlotLocal,
        startTimeFormatted,
        endTimeFormatted,
        durationMinutes,
        overlapCount: currentCount,
        totalMembers,
        overlapRatio: currentCount / totalMembers,
        availableMemberIds,
        unavailableMemberIds,
        utcSlots,
        memberBreakdowns,
      });
    }
    currentBlock = [];
  }

  for (let i = 0; i < localSlotData.length; i++) {
    const item = localSlotData[i];

    // Check if slot starts a new day (to keep windows clean per day)
    const isNewDay = i > 0 && localSlotData[i - 1].localDay !== item.localDay;

    if (item.count >= minRequiredCount) {
      if (currentBlock.length === 0 || (!isNewDay && item.count === currentCount)) {
        currentBlock.push(item);
        currentCount = item.count;
      } else {
        pushCurrentBlock();
        currentBlock = [item];
        currentCount = item.count;
      }
    } else {
      pushCurrentBlock();
    }
  }
  pushCurrentBlock();

  // Sort windows:
  // 1. Overlap Ratio descending (100% first)
  // 2. Duration descending
  // 3. Day of week ascending
  return windows.sort((a, b) => {
    if (b.overlapRatio !== a.overlapRatio) {
      return b.overlapRatio - a.overlapRatio;
    }
    if (b.durationMinutes !== a.durationMinutes) {
      return b.durationMinutes - a.durationMinutes;
    }
    return a.dayOfWeek - b.dayOfWeek;
  });
}
