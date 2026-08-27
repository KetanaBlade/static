import React, { useState } from 'react';
import { generateWindowDiscordMessage } from '../../lib/discord';
import { getTimezoneAbbreviation } from '../../lib/timezone';
import { OverlappingWindow } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trophy, Clock, Users, Copy, Check, Sparkles, CalendarDays, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoldenWindowsListProps {
  windows: OverlappingWindow[];
  groupName: string;
  viewerTimezone: string;
  minRatioFilter?: number;
}

export const GoldenWindowsList: React.FC<GoldenWindowsListProps> = ({
  windows,
  viewerTimezone,
  minRatioFilter = 0.5,
}) => {
  const [copiedDiscordId, setCopiedDiscordId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const tzAbbr = getTimezoneAbbreviation(viewerTimezone);

  React.useEffect(() => {
    const hasPerfectMatch = windows.some((w) => w.overlapRatio === 1);
    if (hasPerfectMatch) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Fallback
      }
    }
  }, [windows]);

  const filteredWindows = windows.filter((w) => w.overlapRatio >= minRatioFilter);

  const handleCopyDiscord = (win: OverlappingWindow) => {
    const discordMessage = generateWindowDiscordMessage(win);
    navigator.clipboard.writeText(discordMessage);
    setCopiedDiscordId(win.id);
    setTimeout(() => setCopiedDiscordId(null), 2500);
  };

  const handleCopyPlainText = (win: OverlappingWindow) => {
    const hours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
    const text = `🎉 ${win.dayName} Hangout Window (${hours} hrs — ${win.startTimeFormatted} to ${win.endTimeFormatted} ${tzAbbr})`;

    navigator.clipboard.writeText(text);
    setCopiedTextId(win.id);
    setTimeout(() => setCopiedTextId(null), 2500);
  };

  if (windows.length === 0) {
    return (
      <Card className="border-dashed bg-card/60">
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">No Overlapping Windows Found</h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Try adjusting the attendance threshold (e.g. to 75%+) or minimum length above to see partial overlaps!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-foreground">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Matching Hangout Times
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Times below are displayed in <strong className="text-foreground">{tzAbbr}</strong> ({viewerTimezone}).
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto tabular-nums bg-background">
          {filteredWindows.length} {filteredWindows.length === 1 ? 'window' : 'windows'} found
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredWindows.map((win) => {
          const isPerfect = win.overlapRatio === 1;
          const isDiscordCopied = copiedDiscordId === win.id;
          const isTextCopied = copiedTextId === win.id;
          const durationHours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);

          return (
            <Card
              key={win.id}
              className={`overflow-hidden border transition-all shadow-sm ${
                isPerfect
                  ? 'border-emerald-500/50 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20'
                  : 'border-border bg-card'
              }`}
            >
              {/* Header Strip with Day, Times, Timezone, and Match Status */}
              <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs uppercase tracking-wide">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {win.dayName}
                    </span>

                    <span className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums tracking-tight">
                      {win.startTimeFormatted} – {win.endTimeFormatted}
                    </span>

                    <Badge variant="outline" className="text-xs font-mono font-bold text-primary bg-primary/5 border-primary/20">
                      {tzAbbr}
                    </Badge>

                    <Badge variant="secondary" className="text-xs font-mono font-bold tabular-nums">
                      {durationHours} {Number(durationHours) === 1 ? 'hr' : 'hrs'}
                    </Badge>
                  </div>

                  {/* Attendance badge */}
                  <div>
                    {isPerfect ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        100% Match — Everyone Free! ({win.overlapCount}/{win.totalMembers})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Users className="w-3.5 h-3.5" />
                        {Math.round(win.overlapRatio * 100)}% Match ({win.overlapCount} of {win.totalMembers} Free)
                      </span>
                    )}
                  </div>
                </div>

                {/* Copy Actions */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyDiscord(win)}
                    title="Copy formatted Discord message with dynamic <t:unix:t> timestamps"
                    className="h-9 px-3.5 text-xs font-bold border-border bg-background shadow-xs hover:border-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/5 cursor-pointer"
                  >
                    {isDiscordCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                        Copied for Discord!
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-[#5865F2]" />
                        Copy for Discord
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPlainText(win)}
                    title="Copy plain text summary"
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isTextCopied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Multi-City Member Local Clocks Box */}
              <CardContent className="p-4 sm:p-5 pt-3 bg-muted/20">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Local Time for Each Member:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {win.memberBreakdowns.map((member) => (
                    <div
                      key={member.memberId}
                      className="p-2.5 rounded-lg bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1"
                    >
                      <div className="text-xs font-bold text-foreground truncate">
                        {member.memberName}
                      </div>
                      <div className="text-xs font-mono font-semibold text-primary tabular-nums">
                        {member.startTimeFormatted} – {member.endTimeFormatted}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-between">
                        <span>{member.dayName}</span>
                        <span className="font-mono text-muted-foreground/80">{member.timezone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
