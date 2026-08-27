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
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md transition-all">
      <div className="container mx-auto max-w-7xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3.5">
        {/* Logo & Group Name */}
        <div className="flex items-center gap-3">
          <div
            onClick={onNewGroup}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Create or Switch Group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-primary tracking-wider uppercase">
                SyncSquad
              </div>
              <div className="text-base sm:text-lg font-black text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                {groupName}
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timezone Selector */}
          <div className="relative inline-flex items-center">
            <Globe className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
            <select
              value={viewerTimezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              aria-label="Select viewing timezone"
              className="h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-xs"
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
            className="h-9 px-3 text-xs sm:text-sm font-mono tabular-nums font-bold shadow-xs cursor-pointer"
            title="Toggle 12h / 24h Time Format"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {timeFormat.toUpperCase()}
          </Button>

          {/* Dark / Light Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDarkModeToggle}
            className="h-9 w-9 p-0 shadow-xs cursor-pointer"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>

          {/* Export to Discord CTA */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDiscordModal}
            className="h-9 px-3.5 text-xs sm:text-sm font-bold hover:border-[#5865F2] hover:text-[#5865F2] shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-1.5 text-[#5865F2]" />
            <span className="hidden sm:inline">Discord Export</span>
            <span className="sm:hidden">Discord</span>
          </Button>

          {/* Share Group CTA */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenShareModal}
            className="h-9 px-4 text-xs sm:text-sm font-extrabold shadow-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share Link
          </Button>
        </div>
      </div>
    </header>
  );
};
