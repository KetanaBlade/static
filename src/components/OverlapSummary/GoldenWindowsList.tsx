import React, { useState } from 'react';
import { generateWindowDiscordMessage } from '../../lib/discord';
import { getTimezoneAbbreviation } from '../../lib/timezone';
import { OverlappingWindow } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trophy, Clock, Users, Copy, Check, X, CalendarDays, MessageSquare } from 'lucide-react';

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
            Try adjusting the "Who's Free" filter (e.g. to Most 75%+) or minimum duration above to see partial overlaps!
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

          const freeMembers = win.memberBreakdowns.filter((m) => win.availableMemberIds.includes(m.memberId));
          const busyMembers = win.memberBreakdowns.filter((m) => win.unavailableMemberIds.includes(m.memberId));

          return (
            <Card
              key={win.id}
              className="overflow-hidden border border-border bg-card shadow-xs hover:border-primary/40 transition-all rounded-xl"
            >
              {/* TOP BAR: Day, Duration, Time Window, Partial Match & Copy Actions */}
              <div className="p-5 sm:p-6 pb-4 sm:pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Day Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs sm:text-sm uppercase tracking-wider">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {win.dayName}
                  </span>

                  {/* Prominent Duration Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-foreground font-bold text-xs sm:text-sm border border-border/60">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {durationHours} {Number(durationHours) === 1 ? 'hr' : 'hrs'}
                  </span>

                  {/* Main Local Time Window */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums tracking-tight">
                      {win.startTimeFormatted} – {win.endTimeFormatted}
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/50 border border-border/50 px-2 py-0.5 rounded-md">
                      {tzAbbr}
                    </span>
                  </div>

                  {/* Partial Match Tag (Only when someone is missing) */}
                  {!isPerfect && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      <Users className="w-3 h-3 text-amber-600" />
                      {win.overlapCount} of {win.totalMembers} Free
                    </span>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyDiscord(win)}
                    title="Copy formatted Discord timestamp"
                    className="h-9 px-3.5 text-xs sm:text-sm font-semibold hover:border-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/5 cursor-pointer shadow-2xs"
                  >
                    {isDiscordCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Copied!
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
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                  >
                    {isTextCopied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* BOTTOM SECTION: Full-Width Member Local Clocks */}
              <CardContent className="p-4 sm:p-6 pt-3.5 sm:pt-4 bg-muted/20">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span>Local Time for Each Member:</span>
                  {!isPerfect && (
                    <span className="text-xs font-normal normal-case text-muted-foreground">
                      <strong className="text-emerald-700 dark:text-emerald-400">Free:</strong> {freeMembers.map((m) => m.memberName).join(', ')}
                      {busyMembers.length > 0 && (
                        <> • <strong className="text-rose-600 dark:text-rose-400">Busy:</strong> {busyMembers.map((m) => m.memberName).join(', ')}</>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...win.memberBreakdowns]
                    .sort((a, b) => {
                      const aFree = win.availableMemberIds.includes(a.memberId) ? 0 : 1;
                      const bFree = win.availableMemberIds.includes(b.memberId) ? 0 : 1;
                      return aFree - bFree;
                    })
                    .map((member) => {
                      const isMemberFree = win.availableMemberIds.includes(member.memberId);

                      return (
                        <div
                          key={member.memberId}
                          className={`p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between space-y-1.5 transition-all ${
                            isMemberFree
                              ? 'bg-card border-border/80'
                              : 'bg-muted/40 border-dashed border-border/60 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-sm font-bold truncate ${isMemberFree ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {member.memberName}
                            </span>
                            {!isPerfect && (
                              isMemberFree ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  Free
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                  <X className="w-2.5 h-2.5 text-rose-500" />
                                  Busy
                                </span>
                              )
                            )}
                          </div>

                          <div className={`text-sm sm:text-base font-mono font-bold tabular-nums ${isMemberFree ? 'text-foreground' : 'text-muted-foreground/70 line-through'}`}>
                            {member.startTimeFormatted} – {member.endTimeFormatted}
                          </div>

                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                            <span>{member.dayName}</span>
                            <span className="font-mono text-muted-foreground/90 font-semibold">{member.timezone}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
