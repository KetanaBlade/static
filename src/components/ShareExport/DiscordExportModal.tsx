import React, { useState } from 'react';
import { generateDiscordSummary } from '../../lib/discord';
import { OverlappingWindow } from '../../types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Copy, Check, MessageSquare } from 'lucide-react';

interface DiscordExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  windows: OverlappingWindow[];
  shareUrl: string;
}

export const DiscordExportModal: React.FC<DiscordExportModalProps> = ({
  isOpen,
  onClose,
  groupName,
  windows,
  shareUrl,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const discordText = React.useMemo(() => {
    return generateDiscordSummary(groupName, windows, shareUrl);
  }, [groupName, windows, shareUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(discordText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MessageSquare className="w-5 h-5 text-[#5865F2]" />
            Export Summary for Discord
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5">
            Copy and paste this into your Discord server or group chat. Each member will see their exact local time listed!
          </DialogDescription>
        </DialogHeader>

        {/* Discord Preview Box */}
        <div className="rounded-md border border-border bg-[#1e1f22] p-4 text-xs font-mono text-neutral-200 overflow-x-auto max-h-[300px] whitespace-pre-wrap selection:bg-[#5865F2]/40">
          {discordText}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleCopy}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold"
            size="sm"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                Copy Discord Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
