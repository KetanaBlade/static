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
 * Generates a clean, minimal Discord timestamp message for an individual window:
 * e.g. "**Saturday:** <t:1724785200:t> – <t:1724799600:t>"
 */
export function generateWindowDiscordMessage(win: OverlappingWindow): string {
  const startUtcSlot = win.utcSlots[0];
  const startUnix = getNextOccurrenceUnix(startUtcSlot);
  const endUnix = startUnix + (win.durationMinutes * 60);

  return `**${win.dayName}:** <t:${startUnix}:t> – <t:${endUnix}:t>`;
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
    '',
  ];

  const topWindows = windows.slice(0, 5);

  topWindows.forEach((win) => {
    const startUtcSlot = win.utcSlots[0];
    const startUnix = getNextOccurrenceUnix(startUtcSlot);
    const endUnix = startUnix + (win.durationMinutes * 60);

    lines.push(`• **${win.dayName}:** <t:${startUnix}:t> – <t:${endUnix}:t>`);
  });

  lines.push('');
  lines.push(`🔗 **View full group schedule:** ${shareUrl}`);

  return lines.join('\n');
}
