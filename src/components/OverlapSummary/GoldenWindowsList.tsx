import React, { useState } from 'react';
import { generateWindowDiscordMessage } from '../../lib/discord';
import { getTimezoneAbbreviation } from '../../lib/timezone';
import { OverlappingWindow } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trophy, Clock, Users, Copy, Check, Sparkles, CalendarDays, MessageSquare } from 'lucide-react';

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

  const filteredWindows = windows.filter((w) => w.overlapRatio >= minRatioFilter);

  const handleCopyDiscord = (win: OverlappingWindow) => {
    const discordMessage = generateWindowDiscordMessage(win);
    navigator.clipboard.writeText(discordMessage);
    setCopiedDiscordId(win.id);
    setTimeout(() => setCopiedDiscordId(null), 2500);
  };

  const handleCopyPlainText = (win: OverlappingWindow) => {
    const hours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
    const text = `${win.dayName}: ${win.startTimeFormatted} – ${win.endTimeFormatted} ${tzAbbr} (${hours} hrs)`;

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
          <h4 className="text-lg font-semibold text-foreground">No Overlapping Windows Found</h4>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Try adjusting the attendance threshold (e.g. to 75%+) or minimum length above to see partial overlaps!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/40">
        <h3 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2.5 text-foreground tracking-tight">
          <Trophy className="w-6 h-6 text-amber-500" />
          Top Matching Times
        </h3>
        <Badge variant="outline" className="text-sm font-bold uppercase tracking-wider bg-card px-3 py-1 text-muted-foreground border-border">
          {filteredWindows.length} {filteredWindows.length === 1 ? 'Match' : 'Matches'}
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
              <div className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-sm uppercase tracking-wide">
                      <CalendarDays className="w-4 h-4" />
                      {win.dayName}
                    </span>

                    <span className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                      {win.startTimeFormatted} – {win.endTimeFormatted}
                    </span>

                    <Badge variant="outline" className="text-sm font-mono font-semibold text-primary bg-primary/5 border-primary/30 px-2.5 py-0.5">
                      {tzAbbr}
                    </Badge>

                    <Badge variant="secondary" className="text-sm font-mono font-semibold tabular-nums px-2.5 py-0.5">
                      {durationHours} {Number(durationHours) === 1 ? 'hr' : 'hrs'}
                    </Badge>
                  </div>

                  {/* Attendance badge */}
                  <div>
                    {isPerfect ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        100% Match — Everyone Free! ({win.overlapCount}/{win.totalMembers})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Users className="w-4 h-4 text-amber-600" />
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
                    title="Copy formatted Discord timestamp (**Day:** <t:unix:t> – <t:unix:t>)"
                    className="h-10 px-4 text-sm font-semibold border-border bg-background shadow-xs hover:border-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/5 cursor-pointer"
                  >
                    {isDiscordCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                        Copied for Discord!
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-1.5 text-[#5865F2]" />
                        Copy for Discord
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPlainText(win)}
                    title="Copy plain text summary"
                    className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                  >
                    {isTextCopied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Multi-City Member Local Clocks Box */}
              <CardContent className="p-5 sm:p-6 pt-4 bg-muted/20">
                <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Local Time for Each Member:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {win.memberBreakdowns.map((member) => (
                    <div
                      key={member.memberId}
                      className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-1.5"
                    >
                      <div className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {member.memberName}
                      </div>
                      <div className="text-sm sm:text-base font-mono font-semibold text-primary tabular-nums">
                        {member.startTimeFormatted} – {member.endTimeFormatted}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center justify-between">
                        <span>{member.dayName}</span>
                        <span className="font-mono text-muted-foreground/90 font-semibold">{member.timezone}</span>
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
