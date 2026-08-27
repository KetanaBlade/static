import React, { useState } from 'react';
import { OverlappingWindow } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trophy, Clock, Users, Globe, Copy, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoldenWindowsListProps {
  windows: OverlappingWindow[];
  groupName: string;
  minRatioFilter?: number; // 1.0 = 100%, 0.75 = 75%, 0.5 = 50%
}

export const GoldenWindowsList: React.FC<GoldenWindowsListProps> = ({
  windows,
  minRatioFilter = 0.5,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Trigger celebration confetti on 100% perfect match load
  React.useEffect(() => {
    const hasPerfectMatch = windows.some((w) => w.overlapRatio === 1);
    if (hasPerfectMatch) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Safe fallback
      }
    }
  }, [windows]);

  const filteredWindows = windows.filter((w) => w.overlapRatio >= minRatioFilter);

  const handleCopyWindow = (win: OverlappingWindow) => {
    const hours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);
    const breakdown = win.memberBreakdowns
      .map((m) => `• ${m.memberName} (${m.timezone}): ${m.dayName} ${m.startTimeFormatted} – ${m.endTimeFormatted}`)
      .join('\n');
    const text = `🎉 **${win.dayName} Hangout Window (${hours} hrs)**\n${breakdown}`;

    navigator.clipboard.writeText(text);
    setCopiedId(win.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (windows.length === 0) {
    return (
      <Card className="border-dashed bg-card/40">
        <CardContent className="py-10 text-center space-y-3">
          <Clock className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <h4 className="text-base font-semibold text-foreground">No Overlapping Windows Yet</h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Once group members add their weekly free hours, the best hangout windows across everyone's timezones will automatically calculate here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Best Hangout Windows
          </h3>
          <p className="text-xs text-muted-foreground">
            Ranked by attendance and duration across all members' local clocks.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold tabular-nums">
          {filteredWindows.length} windows found
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {filteredWindows.map((win) => {
          const isPerfect = win.overlapRatio === 1;
          const isCopied = copiedId === win.id;
          const durationHours = (win.durationMinutes / 60).toFixed(win.durationMinutes % 60 === 0 ? 0 : 1);

          return (
            <Card
              key={win.id}
              className={`transition-all duration-200 ${
                isPerfect
                  ? 'border-emerald-500/40 bg-emerald-500/[0.04] shadow-md hover:border-emerald-500/60'
                  : 'border-border/80 bg-card hover:border-primary/40'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">
                        {win.dayName}
                      </span>
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {win.startTimeFormatted} – {win.endTimeFormatted}
                      </span>
                      <Badge variant="secondary" className="text-[11px] font-mono tabular-nums">
                        {durationHours} hrs
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPerfect ? (
                        <Badge variant="success" className="text-[11px] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          100% Match (Everyone Free!)
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {win.overlapCount} of {win.totalMembers} Free ({Math.round(win.overlapRatio * 100)}%)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyWindow(win)}
                    className="h-8 text-xs font-medium"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy Time
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              {/* Multi-City Timezone Breakdown */}
              <CardContent className="p-4 pt-2">
                <div className="rounded-lg bg-background/60 border border-border/60 p-2.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                    <Globe className="w-3 h-3 text-primary" />
                    Local Times for Each Friend
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {win.memberBreakdowns.map((member) => (
                      <div
                        key={member.memberId}
                        className="text-xs p-1.5 rounded-md bg-card/80 border border-border/40 flex items-center justify-between"
                      >
                        <span className="font-semibold text-foreground truncate max-w-[90px]">
                          {member.memberName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                          {member.dayName.slice(0, 3)} {member.startTimeFormatted} ({member.timezone})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
