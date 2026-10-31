import { CopyButton } from '@/components/copy-button';
import InputError from '@/components/input-error';
import { QrCode } from '@/components/qr-code';
import { ToolHeader } from '@/components/tool-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Clock, Flame, Link2, LinkIcon, LoaderCircle, Lock, PartyPopper, QrCodeIcon, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

function displayShortUrl(url: string): string {
    return url.replace(/^https?:\/\//, '');
}

export default function UrlShortener() {
    const { flash } = usePage<SharedData>().props;
    const { data, setData, post, processing, errors, reset } = useForm({ url: '' });
    const [qrLink, setQrLink] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('short-links.store'), {
            preserveScroll: true,
            onSuccess: () => reset('url'),
        });
    };

    return (
        <AppLayout>
            <Head title="URL Shortener" />
            <div className="relative flex h-full flex-1 flex-col">
                <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                    <section className="space-y-6">
                        <ToolHeader
                            icon={Link2}
                            title="Shorten your"
                            highlight="links"
                            description="Paste a long URL and get a short link that's easy to share."
                        />

                        <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-2">
                            <div
                                className={cn(
                                    'bg-card focus-within:border-primary/50 focus-within:ring-primary/15 flex flex-col gap-2 rounded-2xl border p-2 shadow-lg shadow-black/5 transition focus-within:ring-4 sm:flex-row sm:items-center',
                                    errors.url && 'border-destructive/50',
                                )}
                            >
                                <label htmlFor="url" className="flex flex-1 items-center gap-2 px-2">
                                    <LinkIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                                    <span className="sr-only">URL</span>
                                    <input
                                        id="url"
                                        type="url"
                                        required
                                        autoFocus
                                        value={data.url}
                                        onChange={(e) => setData('url', e.target.value)}
                                        placeholder="https://example.com/a/very/long/link"
                                        className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-base outline-none"
                                    />
                                </label>
                                <Button type="submit" size="lg" disabled={processing} className="rounded-xl px-5">
                                    {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                    Shorten
                                </Button>
                            </div>
                            <InputError message={errors.url} className="px-2" />
                            <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs">
                                <span className="inline-flex items-center gap-1">
                                    <Lock className="h-3.5 w-3.5" /> Encrypted
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Flame className="h-3.5 w-3.5" /> Deleted after first visit
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" /> Unused links expire after 24 hours
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" /> No click tracking
                                </span>
                            </div>
                        </form>

                        {flash.shortUrl && (
                            <div
                                key={flash.shortUrl}
                                className="animate-in fade-in slide-in-from-top-2 mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 pl-4 duration-300"
                            >
                                <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        Your one-time link is ready. It's only shown once, so copy it now, but don't open it yourself or it will be
                                        used up.
                                    </p>
                                    <p className="truncate font-mono text-sm font-medium select-all">{displayShortUrl(flash.shortUrl)}</p>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setQrLink(flash.shortUrl!)} title="Show QR code">
                                    <QrCodeIcon className="h-4 w-4" />
                                </Button>
                                <CopyButton value={flash.shortUrl} title="Copy short link" />
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Dialog open={qrLink !== null} onOpenChange={(open) => !open && setQrLink(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>QR code</DialogTitle>
                        <DialogDescription>
                            Scanning it opens <span className="text-foreground font-mono">{qrLink && displayShortUrl(qrLink)}</span>, which uses up
                            the link. Don't scan it yourself.
                        </DialogDescription>
                    </DialogHeader>
                    {qrLink && <QrCode value={qrLink} filename={`qr-${qrLink.split('/').pop()}`} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
