import React from 'react';
import { POPULAR_TIMEZONES } from '../lib/constants';
import { getTimezoneAbbreviation } from '../lib/timezone';
import { Button } from './ui/button';
import {
  Globe,
  Share2,
  MessageSquare,
  Sun,
  Moon,
  Clock,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  groupName: string;
  viewerTimezone: string;
  onTimezoneChange: (tz: string) => void;
  timeFormat: '12h' | '24h';
  onTimeFormatToggle: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  onOpenShareModal: () => void;
  onOpenDiscordModal: () => void;
  onNewGroup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  groupName,
  viewerTimezone,
  onTimezoneChange,
  timeFormat,
  onTimeFormatToggle,
  isDarkMode,
  onDarkModeToggle,
  onOpenShareModal,
  onOpenDiscordModal,
  onNewGroup,
}) => {
  const tzAbbr = getTimezoneAbbreviation(viewerTimezone);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-md transition-all">
      <div className="container mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Group Name */}
        <div className="flex items-center gap-3">
          <div
            onClick={onNewGroup}
            className="flex items-center gap-2 cursor-pointer group"
            title="Create or Switch Group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary tracking-wider uppercase">
                SyncSquad
              </div>
              <div className="text-sm sm:text-base font-extrabold text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                {groupName}
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timezone Selector */}
          <div className="relative inline-flex items-center">
            <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
            <select
              value={viewerTimezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              aria-label="Select viewing timezone"
              className="h-8 pl-8 pr-2.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value={viewerTimezone}>
                Viewing in: {tzAbbr}
              </option>
              {POPULAR_TIMEZONES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 12h / 24h Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onTimeFormatToggle}
            className="h-8 px-2.5 text-xs font-mono tabular-nums font-semibold"
            title="Toggle 12h / 24h Time Format"
          >
            <Clock className="w-3 h-3 mr-1" />
            {timeFormat.toUpperCase()}
          </Button>

          {/* Dark / Light Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDarkModeToggle}
            className="h-8 w-8 p-0"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          </Button>

          {/* Export to Discord CTA */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDiscordModal}
            className="h-8 px-3 text-xs font-semibold hover:border-[#5865F2] hover:text-[#5865F2]"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-[#5865F2]" />
            <span className="hidden sm:inline">Discord Export</span>
            <span className="sm:hidden">Discord</span>
          </Button>

          {/* Share Group CTA */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenShareModal}
            className="h-8 px-3.5 text-xs font-bold shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share Link
          </Button>
        </div>
      </div>
    </header>
  );
};
