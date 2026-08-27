import { OverlappingWindow } from '../types';

/**
 * Generates a clean, copy-pasteable Discord markdown announcement for a list of golden windows.
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
    `Here are the times where everyone (or most) can make it:`,
    '',
  ];

  const topWindows = windows.slice(0, 5);

  topWindows.forEach((win, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨';
    const matchTag = win.overlapRatio === 1
      ? `🟢 **100% Match** (${win.overlapCount}/${win.totalMembers} free)`
      : `🟡 **${Math.round(win.overlapRatio * 100)}% Match** (${win.overlapCount}/${win.totalMembers} free)`;

    const hoursDuration = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
    lines.push(`${medal} **${win.dayName}** — ${win.startTimeFormatted} to ${win.endTimeFormatted} (${hoursDuration} hrs) — ${matchTag}`);

    if (win.memberBreakdowns && win.memberBreakdowns.length > 0) {
      const breakdownStr = win.memberBreakdowns
        .map((m) => `   • **${m.memberName}** (${m.timezone}): ${m.dayName} ${m.startTimeFormatted} – ${m.endTimeFormatted}`)
        .join('\n');
      lines.push(breakdownStr);
    }
    lines.push('');
  });

  lines.push(`🔗 **Update or view the full schedule:** ${shareUrl}`);

  return lines.join('\n');
}
