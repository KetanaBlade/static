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
  const lastUtcSlot = utcSlots[utcSlots.length - 1];
  const endUtcSlot = (lastUtcSlot + 1) % TOTAL_SLOTS_PER_WEEK;

  return members.map((member) => {
    const startLocal = utcToLocalSlot(startUtcSlot, member.timezone);
    const endLocal = utcToLocalSlot(endUtcSlot, member.timezone);
    const tzAbbr = getTimezoneAbbreviation(member.timezone);

    const startTimeFormatted = formatSlotTime(startLocal.slotInDay, timeFormat);
    let endTimeFormatted = formatSlotTime(endLocal.slotInDay, timeFormat);
    if (startLocal.dayIndex !== endLocal.dayIndex) {
      endTimeFormatted += ' (+1d)';
    }

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
 * spanning seamlessly across midnight boundaries when contiguous.
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

  // Convert all UTC slots to viewer's local slots (0..335)
  const localSlotData: (SlotAvailability & { localDay: number; localSlotInDay: number })[] = [];

  const testDate = new Date();
  const utcOffsetMinutes = Math.round(
    (new Date(testDate.toLocaleString('en-US', { timeZone: viewerTimezone })).getTime() -
     new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) / 60000
  );
  const offsetSlots = Math.round(utcOffsetMinutes / 30);

  for (let localWeekSlot = 0; localWeekSlot < TOTAL_SLOTS_PER_WEEK; localWeekSlot++) {
    const localDay = Math.floor(localWeekSlot / SLOTS_PER_DAY);
    const localSlotInDay = localWeekSlot % SLOTS_PER_DAY;
    const utcSlot = (((localWeekSlot - offsetSlots) % TOTAL_SLOTS_PER_WEEK) + TOTAL_SLOTS_PER_WEEK) % TOTAL_SLOTS_PER_WEEK;

    const data = matrix[utcSlot];
    localSlotData.push({
      ...data,
      localDay,
      localSlotInDay,
    });
  }

  const minRequiredCount = Math.max(1, Math.ceil(totalMembers * 0.5));
  const rawBlocks: (typeof localSlotData[0])[][] = [];

  let currentBlock: (typeof localSlotData[0])[] = [];
  let currentCount = 0;

  for (let i = 0; i < localSlotData.length; i++) {
    const item = localSlotData[i];

    if (item.count >= minRequiredCount) {
      if (currentBlock.length === 0 || item.count === currentCount) {
        currentBlock.push(item);
        currentCount = item.count;
      } else {
        rawBlocks.push(currentBlock);
        currentBlock = [item];
        currentCount = item.count;
      }
    } else {
      if (currentBlock.length > 0) {
        rawBlocks.push(currentBlock);
        currentBlock = [];
      }
    }
  }
  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  // Check circular wrap between end of week (Sunday 23:30) and start of week (Monday 00:00)
  if (
    rawBlocks.length >= 2 &&
    rawBlocks[0][0].localDay === 0 &&
    rawBlocks[0][0].localSlotInDay === 0 &&
    rawBlocks[rawBlocks.length - 1][rawBlocks[rawBlocks.length - 1].length - 1].localDay === 6 &&
    rawBlocks[rawBlocks.length - 1][rawBlocks[rawBlocks.length - 1].length - 1].localSlotInDay === 47 &&
    rawBlocks[0][0].count === rawBlocks[rawBlocks.length - 1][0].count
  ) {
    const firstBlock = rawBlocks.shift()!;
    rawBlocks[rawBlocks.length - 1] = [...rawBlocks[rawBlocks.length - 1], ...firstBlock];
  }

  // Convert contiguous blocks into OverlappingWindow objects
  const windows: OverlappingWindow[] = [];

  for (const block of rawBlocks) {
    if (block.length >= minDurationSlots) {
      const first = block[0];
      const last = block[block.length - 1];
      const startSlotLocal = first.localSlotInDay;
      const endSlotLocal = (last.localSlotInDay + 1) % SLOTS_PER_DAY;
      const durationMinutes = block.length * 30;
      const dayOfWeek = first.localDay;
      const dayName = DAYS_OF_WEEK[dayOfWeek]?.name || 'Unknown';

      const startTimeFormatted = formatSlotTime(startSlotLocal, settings.timeFormat);
      let endTimeFormatted = formatSlotTime(endSlotLocal, settings.timeFormat);
      
      // If the window spans across midnight to the next day
      if (first.localDay !== last.localDay) {
        endTimeFormatted += ' (+1d)';
      }

      const utcSlots = block.map((b) => b.utcSlot);
      const availableMemberIds = members
        .filter((m) => utcSlots.every((slot) => m.slotsUtc.includes(slot)))
        .map((m) => m.id);
      const unavailableMemberIds = members
        .filter((m) => !availableMemberIds.includes(m.id))
        .map((m) => m.id);

      const memberBreakdowns = buildMemberBreakdowns(utcSlots, members, settings.timeFormat);
      const overlapCount = first.count;

      windows.push({
        id: `window-${dayOfWeek}-${startSlotLocal}-${durationMinutes}-${overlapCount}`,
        dayOfWeek,
        dayName,
        startSlotLocal,
        endSlotLocal,
        startTimeFormatted,
        endTimeFormatted,
        durationMinutes,
        overlapCount,
        totalMembers,
        overlapRatio: overlapCount / totalMembers,
        availableMemberIds,
        unavailableMemberIds,
        utcSlots,
        memberBreakdowns,
      });
    }
  }

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
