import React from 'react';
import { Button } from './ui/button';
import {
  Share2,
  MessageSquare,
  Sun,
  Moon,
  Sparkles,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  groupName: string;
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
  timeFormat,
  onTimeFormatToggle,
  isDarkMode,
  onDarkModeToggle,
  onOpenShareModal,
  onOpenDiscordModal,
  onNewGroup,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md transition-all">
      <div className="container mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Logo & Group Title */}
        <div
          onClick={onNewGroup}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="Create or Switch Group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-primary tracking-widest uppercase">
              Static
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-[280px]">
              {groupName}
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* High-Contrast Segmented 12h / 24h Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => timeFormat !== '12h' && onTimeFormatToggle()}
              className={`px-3 py-1 text-xs font-bold rounded-md font-mono tabular-nums transition-all cursor-pointer ${
                timeFormat === '12h'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="12-hour AM/PM clock"
            >
              12H
            </button>
            <button
              type="button"
              onClick={() => timeFormat !== '24h' && onTimeFormatToggle()}
              className={`px-3 py-1 text-xs font-bold rounded-md font-mono tabular-nums transition-all cursor-pointer ${
                timeFormat === '24h'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="24-hour military clock"
            >
              24H
            </button>
          </div>

          {/* High-Contrast Segmented Light / Dark Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => isDarkMode && onDarkModeToggle()}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                !isDarkMode
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Switch to Light Mode"
            >
              <Sun className={`w-3.5 h-3.5 ${!isDarkMode ? 'text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => !isDarkMode && onDarkModeToggle()}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Switch to Dark Mode"
            >
              <Moon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-indigo-300' : ''}`} />
              <span className="hidden sm:inline">Dark</span>
            </button>
          </div>

          {/* Export to Discord CTA */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDiscordModal}
            className="h-9 px-3 text-xs sm:text-sm font-semibold hover:border-[#5865F2] hover:text-[#5865F2] shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-1.5 text-[#5865F2]" />
            <span className="hidden sm:inline">Discord Summary</span>
            <span className="sm:hidden">Discord</span>
          </Button>

          {/* New Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewGroup}
            className="h-9 px-3 text-xs sm:text-sm font-semibold text-foreground hover:border-primary/50 shadow-xs cursor-pointer"
            title="Start a new group schedule"
          >
            <Plus className="w-4 h-4 mr-1 text-primary" />
            <span className="hidden sm:inline">New Group</span>
            <span className="sm:hidden">New</span>
          </Button>

          {/* Share Group CTA (Primary) */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenShareModal}
            className="h-9 px-3.5 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
    </header>
  );
};
