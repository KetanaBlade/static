import React from 'react';
import { Button } from './ui/button';
import {
  Share2,
  Sun,
  Moon,
  Sparkles,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  timeFormat: '12h' | '24h';
  onTimeFormatToggle: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  onOpenShareModal: () => void;
  onOpenDiscordModal?: () => void;
  onNewGroup?: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  timeFormat,
  onTimeFormatToggle,
  isDarkMode,
  onDarkModeToggle,
  onOpenShareModal,
  onNewGroup,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Static Logo & Brand - Click to Go Home */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none text-left focus:outline-none rounded-sm"
          title="Static Home"
        >
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors">
            Static
          </span>
        </button>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented 12h / 24h Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs" role="group" aria-label="Clock format selector">
            <button
              type="button"
              aria-pressed={timeFormat === '12h'}
              onClick={() => timeFormat !== '12h' && onTimeFormatToggle()}
              className={`px-3.5 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg font-mono tracking-tight transition-all cursor-pointer ${
                timeFormat === '12h'
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
              title="12-hour AM/PM clock"
            >
              12H
            </button>
            <button
              type="button"
              aria-pressed={timeFormat === '24h'}
              onClick={() => timeFormat !== '24h' && onTimeFormatToggle()}
              className={`px-3.5 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg font-mono tracking-tight transition-all cursor-pointer ${
                timeFormat === '24h'
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
              title="24-hour military clock"
            >
              24H
            </button>
          </div>

          {/* Segmented Light / Dark Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs" role="group" aria-label="Theme selector">
            <button
              type="button"
              aria-pressed={!isDarkMode}
              onClick={() => isDarkMode && onDarkModeToggle()}
              className={`flex items-center gap-1.5 px-3 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                !isDarkMode
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
              title="Switch to Light Mode"
            >
              <Sun className={`w-3.5 h-3.5 ${!isDarkMode ? 'opacity-100' : 'opacity-70'}`} />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              aria-pressed={isDarkMode}
              onClick={() => !isDarkMode && onDarkModeToggle()}
              className={`flex items-center gap-1.5 px-3 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
              title="Switch to Dark Mode"
            >
              <Moon className={`w-3.5 h-3.5 ${isDarkMode ? 'opacity-100' : 'opacity-70'}`} />
              <span className="hidden sm:inline">Dark</span>
            </button>
          </div>

          {/* New Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewGroup}
            className="h-8 px-3 rounded-md text-xs font-semibold tracking-tight cursor-pointer"
            title="Start a new group schedule"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
            <span className="hidden sm:inline">New Group</span>
            <span className="sm:hidden">New</span>
          </Button>

          {/* Share Group CTA (Primary) */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenShareModal}
            className="h-8 px-3 rounded-md text-xs font-semibold tracking-tight cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
    </header>
  );
});
Header.displayName = 'Header';
