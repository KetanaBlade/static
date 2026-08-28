import React from 'react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md shadow-xs">
      <div className="container mx-auto max-w-7xl px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Static Logo & Brand - Click to Go Home */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none text-left focus:outline-none"
          title="Static Home"
        >
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs shadow-primary/30 border border-primary-foreground/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors leading-none">
              Static
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 leading-tight">
              Scheduler
            </span>
          </div>
        </button>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented 12h / 24h Toggle */}
          <Tabs value={timeFormat} onValueChange={() => onTimeFormatToggle()}>
            <TabsList aria-label="Clock format selector" className="h-9 p-0.5 rounded-md">
              <TabsTrigger value="12h" className="font-mono text-xs px-2.5 py-1 rounded-sm min-h-[30px]" title="12-hour AM/PM clock">
                12H
              </TabsTrigger>
              <TabsTrigger value="24h" className="font-mono text-xs px-2.5 py-1 rounded-sm min-h-[30px]" title="24-hour military clock">
                24H
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Segmented Light / Dark Mode Toggle */}
          <Tabs value={isDarkMode ? 'dark' : 'light'} onValueChange={() => onDarkModeToggle()}>
            <TabsList aria-label="Theme selector" className="h-9 p-0.5 rounded-md">
              <TabsTrigger value="light" className="gap-1 text-xs px-2.5 py-1 rounded-sm min-h-[30px]" title="Switch to Light Mode">
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Light</span>
              </TabsTrigger>
              <TabsTrigger value="dark" className="gap-1 text-xs px-2.5 py-1 rounded-sm min-h-[30px]" title="Switch to Dark Mode">
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dark</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* New Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewGroup}
            className="h-9 px-3 rounded-md text-xs font-semibold tracking-tight cursor-pointer"
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
            className="h-9 px-3.5 rounded-md text-xs font-semibold tracking-tight cursor-pointer shadow-xs shadow-primary/20"
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
