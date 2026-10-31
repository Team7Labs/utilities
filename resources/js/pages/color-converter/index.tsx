import { CopyButton } from '@/components/copy-button';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { contrastRatio, parseColor, type Rgba, toHex, toHslString, toOklchString, toRgbString, WCAG_THRESHOLDS } from '@/lib/color';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { ArrowDownUp, Check, CircleAlert, Palette, TriangleAlert, X } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';

/** Checkerboard behind swatches so transparency is visible. */
const CHECKERBOARD: CSSProperties = {
    backgroundImage: 'repeating-conic-gradient(#d4d4d8 0 25%, #fafafa 0 50%)',
    backgroundSize: '16px 16px',
};

function useColor(input: string) {
    return useMemo(() => {
        if (!input.trim()) return { color: null, error: null };
        try {
            return { color: parseColor(input), error: null };
        } catch (e) {
            return { color: null, error: (e as Error).message };
        }
    }, [input]);
}

function Swatch({ color, className }: { color: Rgba | null; className?: string }) {
    return (
        <div className={cn('overflow-hidden rounded-xl border', className)} style={CHECKERBOARD}>
            <div className="h-full w-full" style={{ background: color ? toRgbString(color) : 'transparent' }} />
        </div>
    );
}

interface ColorFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    color: Rgba | null;
    error: string | null;
}

function ColorField({ id, label, value, onChange, color, error }: ColorFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex gap-2">
                <label
                    className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border"
                    style={CHECKERBOARD}
                    title="Pick a color"
                >
                    <span className="absolute inset-0" style={{ background: color ? toRgbString(color) : 'transparent' }} />
                    <input
                        type="color"
                        value={color ? toHex({ ...color, alpha: 1 }) : '#000000'}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label={`${label} picker`}
                    />
                </label>
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    className={cn('font-mono', error && 'border-destructive/50')}
                />
            </div>
            {error && (
                <p className="text-destructive flex items-center gap-1.5 text-xs">
                    <CircleAlert className="h-3.5 w-3.5" /> {error}
                </p>
            )}
        </div>
    );
}

function Converter({ input, setInput }: { input: string; setInput: (value: string) => void }) {
    const { color, error } = useColor(input);

    const formats = color
        ? [
              { label: 'HEX', value: toHex(color) },
              { label: 'RGB', value: toRgbString(color) },
              { label: 'HSL', value: toHslString(color) },
              { label: 'OKLCH', value: toOklchString(color) },
          ]
        : [];

    return (
        <ToolPanel title="Convert">
            <div className="grid gap-4 p-4 md:grid-cols-[12rem_1fr]">
                <Swatch color={color} className="h-32 md:h-auto" />
                <div className="space-y-4">
                    <ColorField id="color-input" label="Any color" value={input} onChange={setInput} color={color} error={error} />
                    {color?.clipped && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            This OKLCH color is outside the sRGB gamut, so the hex, RGB and HSL values are the nearest displayable color.
                        </p>
                    )}
                    <ul className="divide-y rounded-xl border">
                        {formats.map((format) => (
                            <li key={format.label} className="flex items-center gap-3 py-1 pr-1 pl-3">
                                <span className="text-muted-foreground w-14 shrink-0 text-xs font-semibold">{format.label}</span>
                                <code className="min-w-0 flex-1 truncate font-mono text-sm select-all">{format.value}</code>
                                <CopyButton value={format.value} title={`Copy ${format.label}`} className="size-8" />
                            </li>
                        ))}
                        {!color && <li className="text-muted-foreground px-3 py-6 text-center text-sm">Enter a color to convert it.</li>}
                    </ul>
                </div>
            </div>
        </ToolPanel>
    );
}

function ContrastChecker({ suggestion }: { suggestion: string }) {
    const [foreground, setForeground] = useState('#1e293b');
    const [background, setBackground] = useState('#ffffff');
    const fg = useColor(foreground);
    const bg = useColor(background);
    const ratio = fg.color && bg.color ? contrastRatio(fg.color, bg.color) : null;

    return (
        <ToolPanel
            title="Contrast checker (WCAG 2)"
            actions={
                <Button type="button" variant="ghost" size="sm" onClick={() => setForeground(suggestion)} disabled={!suggestion.trim()}>
                    Use converter color
                </Button>
            }
        >
            <div className="grid gap-6 p-4 md:grid-cols-2">
                <div className="space-y-4">
                    <ColorField id="fg" label="Text color" value={foreground} onChange={setForeground} color={fg.color} error={fg.error} />
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-full"
                            title="Swap colors"
                            onClick={() => {
                                setForeground(background);
                                setBackground(foreground);
                            }}
                        >
                            <ArrowDownUp className="h-4 w-4" />
                        </Button>
                    </div>
                    <ColorField id="bg" label="Background" value={background} onChange={setBackground} color={bg.color} error={bg.error} />
                    <div
                        className="space-y-1 rounded-xl border p-5"
                        style={{
                            color: fg.color ? toRgbString(fg.color) : undefined,
                            background: bg.color ? toRgbString(bg.color) : undefined,
                        }}
                    >
                        <p className="text-2xl font-bold">Large text, 24px bold</p>
                        <p className="text-sm">Normal body text at 14px. The quick brown fox jumps over the lazy dog.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-muted/30 rounded-xl border p-5 text-center">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Contrast ratio</p>
                        <p className="text-5xl font-bold tabular-nums">{ratio ? `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1` : '–'}</p>
                    </div>
                    <ul className="divide-y rounded-xl border">
                        {WCAG_THRESHOLDS.map((check) => {
                            const pass = ratio !== null && ratio >= check.min;
                            return (
                                <li key={`${check.level}-${check.target}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                                    <span className="w-10 font-semibold">{check.level}</span>
                                    <span className="flex-1">{check.target}</span>
                                    <span className="text-muted-foreground text-xs tabular-nums">≥ {check.min}:1</span>
                                    <span
                                        className={cn(
                                            'inline-flex w-16 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                                            ratio === null
                                                ? 'bg-muted text-muted-foreground'
                                                : pass
                                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                  : 'bg-destructive/10 text-destructive',
                                        )}
                                    >
                                        {ratio !== null && (pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
                                        {ratio === null ? '–' : pass ? 'Pass' : 'Fail'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="text-muted-foreground text-xs">
                        Large text is at least 24px, or 18.66px bold. Translucent colors are blended onto the background, which is assumed to sit on
                        white.
                    </p>
                </div>
            </div>
        </ToolPanel>
    );
}

export default function ColorConverter() {
    const [input, setInput] = useState('#6366f1');

    return (
        <AppLayout>
            <Head title="Color Converter" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Palette}
                    title="Color"
                    highlight="converter"
                    description="Convert between HEX, RGB, HSL and OKLCH, and check WCAG contrast."
                    note={BROWSER_ONLY_NOTE}
                />
                <Converter input={input} setInput={setInput} />
                <ContrastChecker suggestion={input} />
            </div>
        </AppLayout>
    );
}
