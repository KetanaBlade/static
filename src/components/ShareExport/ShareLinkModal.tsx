import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Share2, Copy, Check, Sparkles } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  shareUrl: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  groupName,
  shareUrl,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Group Link
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Send this link to your friends in <strong>{groupName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full h-10 px-3 rounded-lg border border-border bg-muted/40 text-xs font-mono select-all focus:outline-none"
            />
            <Button onClick={handleCopy} size="sm" className="h-10 shrink-0 font-semibold">
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="rounded-xl bg-card border border-border/80 p-3 space-y-2 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Zero-Friction for Friends:
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px]">
              <li>No account or password needed.</li>
              <li>Automatically detects their local timezone (e.g. Dublin, Los Angeles).</li>
              <li>Their availability updates the group heatmap in real-time.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
