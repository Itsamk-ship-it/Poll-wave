'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Facebook, Linkedin, Loader2, MessageCircle, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import { pollsApi } from '@/lib/services';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface ShareDialogProps {
  pollSlug: string;
  trigger: React.ReactNode;
}

const SOCIAL = [
  { key: 'twitter', label: 'Twitter', icon: Twitter },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const;

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <Button type="button" variant="outline" onClick={copy} className="shrink-0">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function ShareDialog({ pollSlug, trigger }: ShareDialogProps) {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['poll-share', pollSlug],
    queryFn: () => pollsApi.share(pollSlug),
    enabled: open,
    staleTime: 60_000,
  });

  const url = data?.url ?? '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this poll</DialogTitle>
          <DialogDescription>Spread the word and gather more votes.</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="qr">QR</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Input readOnly value={url} onFocus={(e) => e.target.select()} />
                <CopyButton value={url} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL.map(({ key, label, icon: Icon }) => {
                  const href = data.social?.[key];
                  if (!href) return null;
                  return (
                    <Button key={key} variant="outline" asChild className="justify-start">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        <Icon className="h-4 w-4" />
                        {label}
                      </a>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="qr" className="pt-2">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG value={url} size={180} level="M" includeMargin={false} />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Scan to open the poll on any device.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-3 pt-2">
              <Textarea readOnly value={data.embed} rows={4} className="font-mono text-xs" />
              <div className="flex justify-end">
                <CopyButton value={data.embed} label="Copy embed code" />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
