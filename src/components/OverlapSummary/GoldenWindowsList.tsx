import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
          <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mx-auto">
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
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-base font-bold flex items-center gap-2 text-foreground tracking-tight">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top Matching Times
        </h3>
        <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider bg-card px-2.5 py-0.5 text-muted-foreground border-border">
          {filteredWindows.length} {filteredWindows.length === 1 ? 'Match' : 'Matches'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredWindows.map((win, idx) => {
            const isPerfect = win.overlapRatio === 1;
            const isDiscordCopied = copiedDiscordId === win.id;
            const isTextCopied = copiedTextId === win.id;
            const durationHours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);

            const freeMembers = win.memberBreakdowns.filter((m) => win.availableMemberIds.includes(m.memberId));
            const busyMembers = win.memberBreakdowns.filter((m) => win.unavailableMemberIds.includes(m.memberId));

            return (
              <motion.div
                key={win.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.2) }}
              >
                <Card
                  className="overflow-hidden border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 rounded-lg group"
                >
                  {/* TOP BAR: Day, Duration, Time Window, Partial Match & Copy Actions */}
                  <div className="p-4 sm:p-5 pb-3.5 sm:pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      {/* Day Badge */}
                      <span className="font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider border border-primary/20">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {win.dayName}
                      </span>

                      {/* Prominent Duration Badge */}
                      <span className="font-mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-background/80 text-foreground font-semibold text-xs border border-border">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {durationHours} {Number(durationHours) === 1 ? 'hr' : 'hrs'}
                      </span>

                      {/* Main Local Time Window */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight font-mono">
                          {win.startTimeFormatted} – {win.endTimeFormatted}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-muted-foreground bg-background/80 border border-border px-1.5 py-0.5 rounded-sm">
                          {tzAbbr}
                        </span>
                      </div>

                      {/* Partial Match Tag (Only when someone is missing) */}
                      {!isPerfect && (
                        <span className="font-mono inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
                          <Users className="w-3 h-3 text-amber-600" />
                          {win.overlapCount}/{win.totalMembers} Free
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
                        className={`h-8 px-3 text-xs font-semibold cursor-pointer shadow-2xs rounded-md transition-all ${
                          isDiscordCopied
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'hover:border-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/5'
                        }`}
                      >
                        {isDiscordCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600 animate-in zoom-in-75 duration-150" />
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
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium rounded-md"
                      >
                        {isTextCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-75 duration-150" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

              {/* BOTTOM SECTION: Member Local Clocks */}
              <CardContent className="p-4 sm:p-5 pt-3.5 bg-muted/10">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span>Local Clocks:</span>
                  {!isPerfect && (
                    <span className="font-normal text-muted-foreground lowercase text-xs">
                      <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{freeMembers.length} free</strong>
                      {busyMembers.length > 0 && (
                        <> • <strong className="text-rose-600 dark:text-rose-400">{busyMembers.length} busy</strong> ({busyMembers.map((m) => m.memberName).join(', ')})</>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[...win.memberBreakdowns]
                    .sort((a, b) => {
                      const aFree = win.availableMemberIds.includes(a.memberId) ? 0 : 1;
                      const bFree = win.availableMemberIds.includes(b.memberId) ? 0 : 1;
                      return aFree - bFree;
                    })
                    .map((member) => {
                      const isMemberFree = win.availableMemberIds.includes(member.memberId);
                      const isDifferentDay = member.dayName !== win.dayName;
                      const memberTzAbbr = getTimezoneAbbreviation(member.timezone);

                      return (
                        <div
                          key={member.memberId}
                          className={`p-2.5 rounded-md text-xs transition-colors ${
                            isMemberFree
                              ? 'bg-background/80 hover:bg-background text-foreground'
                              : 'bg-muted/20 text-muted-foreground opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 font-semibold mb-1">
                            <span className="truncate flex items-center gap-1.5">
                              {isMemberFree ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              )}
                              <span className="truncate">{member.memberName}</span>
                            </span>
                            {!isPerfect && (
                              isMemberFree ? (
                                <span className="font-mono inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-sm shrink-0">
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  Free
                                </span>
                              ) : (
                                <span className="font-mono inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded-sm shrink-0">
                                  <X className="w-2.5 h-2.5 text-rose-500" />
                                  Busy
                                </span>
                              )
                            )}
                          </div>

                          <div className={`text-sm font-mono font-bold tabular-nums flex items-center justify-between ${isMemberFree ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                            <span>{member.startTimeFormatted} – {member.endTimeFormatted}</span>
                            {isDifferentDay && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-primary/10 text-primary">
                                {member.dayName.slice(0, 3)}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between mt-1">
                            <span>{member.dayName}</span>
                            <span className="font-mono text-muted-foreground/80 font-semibold">{memberTzAbbr}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
</div>
);
};
