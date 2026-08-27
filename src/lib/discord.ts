import { OverlappingWindow, SlotIndex } from '../types';

/**
 * Calculates the Unix timestamp (in seconds) for the next upcoming occurrence
 * of a given UTC 30-minute slot in the weekly recurring cycle.
 */
export function getNextOccurrenceUnix(utcSlot: SlotIndex): number {
  const dayIndexUtc = Math.floor(utcSlot / 48); // 0 = Mon, ..., 6 = Sun
  const slotInDayUtc = utcSlot % 48;
  const hourUtc = Math.floor(slotInDayUtc / 2);
  const minuteUtc = (slotInDayUtc % 2) * 30;

  const now = new Date();
  // In JS Date, getUTCDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert our dayIndexUtc (0=Mon..6=Sun) to JS UTC day (0=Sun, 1=Mon..6=Sat)
  const targetJsDay = dayIndexUtc === 6 ? 0 : dayIndexUtc + 1;
  const currentJsDay = now.getUTCDay();

  let daysUntil = (targetJsDay - currentJsDay + 7) % 7;

  // Build target Date in UTC
  const targetDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntil,
    hourUtc,
    minuteUtc,
    0,
    0
  ));

  // If target time today has already passed in UTC, schedule for next week (+7 days)
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 7);
  }

  return Math.floor(targetDate.getTime() / 1000);
}

/**
 * Generates a clean Discord message for an individual window using Discord's
 * dynamic Unix timestamp tags (<t:UNIX:t>) which automatically format in each reader's local clock.
 */
export function generateWindowDiscordMessage(win: OverlappingWindow): string {
  const startUtcSlot = win.utcSlots[0];
  const endUtcSlot = win.utcSlots[win.utcSlots.length - 1] + 1; // exclusive

  const startUnix = getNextOccurrenceUnix(startUtcSlot);
  const endUnix = getNextOccurrenceUnix(endUtcSlot);

  const durationHours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
  const matchEmoji = win.overlapRatio === 1 ? '🟢' : '🟡';
  const matchText = win.overlapRatio === 1 ? '100% Free' : `${Math.round(win.overlapRatio * 100)}% Free`;

  const lines: string[] = [
    `🎉 **${win.dayName} Hangout Window (${durationHours} hrs)** — ${matchEmoji} ${matchText}`,
    `⏰ **Every ${win.dayName}:** <t:${startUnix}:t> to <t:${endUnix}:t> *(renders in your local time)*`,
    '',
    `👥 **Local Times Breakdown:**`,
  ];

  if (win.memberBreakdowns && win.memberBreakdowns.length > 0) {
    win.memberBreakdowns.forEach((m) => {
      lines.push(`• **${m.memberName}** (${m.timezone}): ${m.dayName} ${m.startTimeFormatted} – ${m.endTimeFormatted}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generates a clean, copy-pasteable full group Discord announcement with dynamic Unix timestamps.
 */
export function generateDiscordSummary(
  groupName: string,
  windows: OverlappingWindow[],
  shareUrl: string
): string {
  if (windows.length === 0) {
    return `📅 **${groupName} — Availability Sync**\nNo overlapping windows found yet. Add your free hours here: ${shareUrl}`;
  }

  const lines: string[] = [
    `📅 **${groupName} — Best Weekly Hangout Windows** 🎉`,
    `Here are the recurring times where the group can meet:`,
    '',
  ];

  const topWindows = windows.slice(0, 5);

  topWindows.forEach((win, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨';
    const startUtcSlot = win.utcSlots[0];
    const endUtcSlot = win.utcSlots[win.utcSlots.length - 1] + 1;
    const startUnix = getNextOccurrenceUnix(startUtcSlot);
    const endUnix = getNextOccurrenceUnix(endUtcSlot);

    const matchTag = win.overlapRatio === 1
      ? `🟢 **100% Match** (${win.overlapCount}/${win.totalMembers} free)`
      : `🟡 **${Math.round(win.overlapRatio * 100)}% Match** (${win.overlapCount}/${win.totalMembers} free)`;

    const hoursDuration = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
    lines.push(`${medal} **${win.dayName}** (${hoursDuration} hrs) — ${matchTag}`);
    lines.push(`   ⏰ Every **${win.dayName}**: <t:${startUnix}:t> – <t:${endUnix}:t>`);

    if (win.memberBreakdowns && win.memberBreakdowns.length > 0) {
      const breakdownStr = win.memberBreakdowns
        .map((m) => `   • **${m.memberName}** (${m.timezone}): ${m.dayName} ${m.startTimeFormatted} – ${m.endTimeFormatted}`)
        .join('\n');
      lines.push(breakdownStr);
    }
    lines.push('');
  });

  lines.push(`🔗 **Update or view the live schedule:** ${shareUrl}`);

  return lines.join('\n');
}
