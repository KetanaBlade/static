import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Share2, Copy, Check, Sparkles } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  shareUrl: string;
  adminPin?: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  groupName,
  shareUrl,
  adminPin,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isPinCopied, setIsPinCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link: ', err);
    }
  };

  const handleCopyPin = () => {
    if (!adminPin) return;
    navigator.clipboard.writeText(adminPin);
    setIsPinCopied(true);
    setTimeout(() => setIsPinCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Share2 className="w-5 h-5 text-primary" />
            Share Group Link
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            Send this link to your friends in <strong>{groupName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Member Invite Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full h-10 text-xs font-mono select-all bg-muted/40"
              />
              <Button onClick={handleCopy} size="sm" className="h-10 shrink-0 font-semibold">
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {adminPin && (
            <div className="p-3.5 rounded-md bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Organizer Admin PIN
                </div>
                <div className="text-sm font-mono font-bold text-amber-900 dark:text-amber-100">
                  {adminPin}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPin}
                className="h-8 text-xs font-semibold border-amber-500/30 hover:bg-amber-500/20"
              >
                {isPinCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {isPinCopied ? 'Copied' : 'Copy PIN'}
              </Button>
            </div>
          )}

          <div className="rounded-md bg-card border border-border p-3.5 space-y-2 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Zero-Friction for Friends:
            </div>
            <ul className="space-y-1.5 pl-4 list-disc text-xs text-muted-foreground">
              <li>No account or password needed for friends to join.</li>
              <li>Automatically detects their local timezone (e.g. Dublin, PST).</li>
              <li>Their painted availability updates the group heatmap in real-time.</li>
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
