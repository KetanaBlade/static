import React from 'react';
import { Button } from './ui/button';
import {
  Share2,
  MessageSquare,
  Sun,
  Moon,
  Clock,
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
              SyncSquad
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate max-w-[200px] sm:max-w-[320px]">
              {groupName}
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          {/* New Group Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewGroup}
            className="h-9 px-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            title="Start a new group schedule"
          >
            <Plus className="w-4 h-4 mr-1 text-primary" />
            New Group
          </Button>

          {/* 12h / 24h Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onTimeFormatToggle}
            className="h-9 px-2.5 text-xs sm:text-sm font-mono tabular-nums font-semibold shadow-xs cursor-pointer"
            title="Toggle 12h / 24h Time Format"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
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
            className="h-9 px-3 text-xs sm:text-sm font-semibold hover:border-[#5865F2] hover:text-[#5865F2] shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-1.5 text-[#5865F2]" />
            <span className="hidden sm:inline">Discord Summary</span>
            <span className="sm:hidden">Discord</span>
          </Button>

          {/* Share Group CTA */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenShareModal}
            className="h-9 px-3.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
    </header>
  );
};
