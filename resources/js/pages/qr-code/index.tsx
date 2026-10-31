import { QrCode as QrPreview } from '@/components/qr-code';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { editorClass, ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { contrastRatio, luminance, parseColor } from '@/lib/color';
import { DEFAULT_QR_OPTIONS, encodeQr, type ErrorCorrection, type QrOptions } from '@/lib/qr';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { CircleAlert, Eraser, QrCode, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

const PNG_SIZES = [256, 512, 1024, 2048];

const ERROR_CORRECTION: { value: ErrorCorrection; label: string; hint: string }[] = [
    { value: 'L', label: 'L', hint: 'Low, about 7% of the code can be damaged' },
    { value: 'M', label: 'M', hint: 'Medium, about 15% recoverable' },
    { value: 'Q', label: 'Q', hint: 'Quartile, about 25% recoverable' },
    { value: 'H', label: 'H', hint: 'High, about 30% recoverable. Best if you’ll print it small or add a logo' },
];

function ColorPicker({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-2 shadow-xs">
                <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded" />
                <span className="font-mono text-sm">{value}</span>
            </label>
        </div>
    );
}

export default function QrCodeGenerator() {
    const [text, setText] = useState('https://example.com');
    const [options, setOptions] = useState<QrOptions>(DEFAULT_QR_OPTIONS);
    const [pngSize, setPngSize] = useState(1024);
    const set = <K extends keyof QrOptions>(key: K, value: QrOptions[K]) => setOptions((current) => ({ ...current, [key]: value }));

    const info = useMemo(() => {
        if (!text) return null;
        try {
            const { size } = encodeQr(text, options.errorCorrection);
            return { size, version: (size - 17) / 4, error: null };
        } catch (e) {
            return { size: 0, version: 0, error: (e as Error).message };
        }
    }, [text, options.errorCorrection]);

    const colorWarning = useMemo(() => {
        const fg = parseColor(options.foreground);
        const bg = parseColor(options.background);
        if (luminance(fg) > luminance(bg)) return 'Light-on-dark codes don’t scan in many apps. Use a darker foreground than background.';
        if (contrastRatio(fg, bg) < 4) return 'Low contrast between the colors may make the code hard to scan.';
        return null;
    }, [options.foreground, options.background]);

    return (
        <AppLayout>
            <Head title="QR Code Generator" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={QrCode}
                    title="QR code"
                    highlight="generator"
                    description="Turn text or a link into a QR code and download it as PNG or SVG."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_22rem]">
                    <div className="flex flex-col gap-4">
                        <ToolPanel
                            title={<Label htmlFor="qr-text">Text or URL</Label>}
                            actions={
                                <Button type="button" variant="ghost" size="sm" onClick={() => setText('')} disabled={!text}>
                                    <Eraser className="h-4 w-4" />
                                    Clear
                                </Button>
                            }
                            footer={`${new TextEncoder().encode(text).length.toLocaleString()} bytes${info && !info.error ? ` · version ${info.version}, ${info.size}×${info.size} modules` : ''}`}
                            className={cn(info?.error && 'border-destructive/50')}
                        >
                            <Textarea
                                id="qr-text"
                                autoFocus
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="https://example.com"
                                spellCheck={false}
                                className={cn(editorClass, 'min-h-40')}
                            />
                        </ToolPanel>

                        <ToolPanel title="Options">
                            <div className="grid gap-4 p-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label>Error correction</Label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Segmented
                                            value={options.errorCorrection}
                                            onChange={(value) => set('errorCorrection', value)}
                                            options={ERROR_CORRECTION}
                                        />
                                        <span className="text-muted-foreground text-xs">
                                            {ERROR_CORRECTION.find((level) => level.value === options.errorCorrection)?.hint}
                                        </span>
                                    </div>
                                </div>
                                <ColorPicker
                                    id="qr-fg"
                                    label="Foreground"
                                    value={options.foreground}
                                    onChange={(value) => set('foreground', value)}
                                />
                                <ColorPicker
                                    id="qr-bg"
                                    label="Background"
                                    value={options.background}
                                    onChange={(value) => set('background', value)}
                                />
                                {colorWarning && (
                                    <p className="flex items-start gap-1.5 text-xs text-amber-600 sm:col-span-2 dark:text-amber-400">
                                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {colorWarning}
                                    </p>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor="qr-margin">Quiet zone (modules)</Label>
                                    <Input
                                        id="qr-margin"
                                        type="number"
                                        min={0}
                                        max={16}
                                        value={options.margin}
                                        onChange={(e) => set('margin', Math.min(Math.max(Math.floor(Number(e.target.value)) || 0, 0), 16))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>PNG size</Label>
                                    <Segmented
                                        value={String(pngSize)}
                                        onChange={(value) => setPngSize(Number(value))}
                                        options={PNG_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                                    />
                                </div>
                            </div>
                        </ToolPanel>
                    </div>

                    <ToolPanel title="Preview">
                        <div className="flex flex-1 items-center justify-center p-6">
                            {info?.error ? (
                                <p className="text-destructive flex items-start gap-2 text-sm">
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {info.error}
                                </p>
                            ) : text ? (
                                <QrPreview value={text} options={options} pngSize={pngSize} className="w-full" />
                            ) : (
                                <p className="text-muted-foreground text-sm">Enter text to generate a QR code.</p>
                            )}
                        </div>
                    </ToolPanel>
                </section>
            </div>
        </AppLayout>
    );
}
