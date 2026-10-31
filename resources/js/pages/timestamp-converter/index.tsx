import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import {
    calendarInfo,
    formatLong,
    formatOffset,
    isValidTimeZone,
    listTimeZones,
    localTimeZone,
    offsetMinutes,
    parseTime,
    relativeTime,
    toDatetimeLocal,
    toZonedIso,
    type Unit,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { ArrowDown, CircleAlert, Clock, Globe, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const UNITS: { value: Unit; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'seconds', label: 's' },
    { value: 'milliseconds', label: 'ms' },
    { value: 'microseconds', label: 'µs' },
    { value: 'nanoseconds', label: 'ns' },
];

/** Ticks every second. Null until mounted so server and client render the same markup. */
function useNow(paused: boolean): number | null {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        if (paused) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [paused]);
    return now;
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <li className="flex items-center gap-3 py-1 pr-1 pl-4">
            <span className="text-muted-foreground w-36 shrink-0 text-xs font-semibold">{label}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-sm select-all" title={value}>
                {value}
            </code>
            <CopyButton value={value} title={`Copy ${label}`} className="size-8" />
        </li>
    );
}

function LiveNow({ zone, onUse }: { zone: string; onUse: (value: string) => void }) {
    const [paused, setPaused] = useState(false);
    const now = useNow(paused);

    const values =
        now === null
            ? []
            : [
                  { label: 'Unix seconds', value: String(Math.floor(now / 1000)) },
                  { label: 'Unix milliseconds', value: String(now) },
                  { label: 'ISO 8601 (UTC)', value: new Date(now).toISOString() },
              ];

    return (
        <ToolPanel
            title={
                <span className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', paused ? 'bg-muted-foreground' : 'animate-pulse bg-emerald-500')} />
                    Now
                </span>
            }
            actions={
                <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPaused(!paused)}>
                        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {paused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => now !== null && onUse(String(Math.floor(now / 1000)))}
                        disabled={now === null}
                    >
                        <ArrowDown className="h-4 w-4" />
                        Convert
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 p-4 md:grid-cols-[auto_1fr] md:items-center">
                <div className="text-center md:pr-4 md:text-left">
                    <p className="text-4xl font-bold tabular-nums">{values[0]?.value ?? '–'}</p>
                    <p className="text-muted-foreground text-sm tabular-nums">{now !== null && zone ? formatLong(now, zone) : ' '}</p>
                </div>
                <ul className="divide-y rounded-xl border">
                    {values.map((item) => (
                        <Row key={item.label} {...item} />
                    ))}
                </ul>
            </div>
        </ToolPanel>
    );
}

export default function TimestampConverter() {
    const [input, setInput] = useState('');
    const [unit, setUnit] = useState<Unit>('auto');
    const [zone, setZone] = useState('');
    const [zoneInput, setZoneInput] = useState('');
    const [local, setLocal] = useState('');
    const [zones, setZones] = useState<string[]>([]);
    const now = useNow(false);

    // Time zone and starting value depend on the browser, so set them after mount.
    useEffect(() => {
        const browserZone = localTimeZone();
        setLocal(browserZone);
        setZone(browserZone);
        setZoneInput(browserZone);
        setZones(listTimeZones());
        setInput(String(Math.floor(Date.now() / 1000)));
    }, []);

    const chooseZone = (value: string) => {
        setZoneInput(value);
        if (isValidTimeZone(value)) setZone(value);
    };

    const result = useMemo(() => {
        if (!zone || !input.trim()) return null;
        try {
            return { parsed: parseTime(input, unit, zone), error: null };
        } catch (e) {
            return { parsed: null, error: (e as Error).message };
        }
    }, [input, unit, zone]);

    const parsed = result?.parsed;
    const rows = useMemo(() => {
        if (!parsed) return [];
        const { ms } = parsed;
        const { dayOfYear, isoWeek } = calendarInfo(ms, zone);
        return [
            { label: 'Unix seconds', value: String(Math.floor(ms / 1000)) },
            { label: 'Unix milliseconds', value: String(ms) },
            { label: 'ISO 8601 (UTC)', value: new Date(ms).toISOString() },
            { label: `ISO 8601 (${zone})`, value: toZonedIso(ms, zone) },
            ...(local && local !== zone ? [{ label: `ISO 8601 (${local})`, value: toZonedIso(ms, local) }] : []),
            { label: 'RFC 7231 (HTTP)', value: new Date(ms).toUTCString() },
            { label: `Readable (${zone})`, value: formatLong(ms, zone) },
            { label: 'Day / week', value: `Day ${dayOfYear} of the year · ISO week ${isoWeek}` },
        ];
    }, [parsed, zone, local]);

    const zoneInvalid = zoneInput !== '' && zoneInput !== zone;

    return (
        <AppLayout>
            <Head title="Timestamp Converter" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Clock}
                    title="Timestamp"
                    highlight="converter"
                    description="Convert Unix timestamps, ISO 8601 and local times, in any time zone."
                    note={BROWSER_ONLY_NOTE}
                />

                <LiveNow zone={zone} onUse={(value) => setInput(value)} />

                <ToolPanel title="Convert">
                    <div className="flex flex-col gap-4 border-b p-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="time-input">Timestamp or date</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    id="time-input"
                                    autoFocus
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="1793452200, 2026-10-31T14:30:00Z or 2026-10-31 14:30"
                                    spellCheck={false}
                                    autoComplete="off"
                                    className={cn('font-mono', result?.error && 'border-destructive/50')}
                                />
                                <Segmented value={unit} onChange={setUnit} options={UNITS} className="shrink-0" />
                            </div>
                            {result?.error ? (
                                <p className="text-destructive flex items-center gap-1.5 text-xs">
                                    <CircleAlert className="h-3.5 w-3.5" /> {result.error}
                                </p>
                            ) : (
                                parsed && <p className="text-muted-foreground text-xs">Read as: {parsed.detected}</p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="time-zone" className="flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" /> Time zone
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="time-zone"
                                        list="time-zones"
                                        value={zoneInput}
                                        onChange={(e) => chooseZone(e.target.value)}
                                        onBlur={() => setZoneInput(zone)}
                                        spellCheck={false}
                                        autoComplete="off"
                                        className={cn(zoneInvalid && 'border-destructive/50')}
                                    />
                                    <datalist id="time-zones">
                                        {zones.map((z) => (
                                            <option key={z} value={z} />
                                        ))}
                                    </datalist>
                                    <Button
                                        type="button"
                                        variant={zone === local ? 'secondary' : 'outline'}
                                        onClick={() => chooseZone(local)}
                                        disabled={!local}
                                    >
                                        Local
                                    </Button>
                                    <Button type="button" variant={zone === 'UTC' ? 'secondary' : 'outline'} onClick={() => chooseZone('UTC')}>
                                        UTC
                                    </Button>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {zoneInvalid
                                        ? 'Pick a zone from the list, like Europe/London.'
                                        : zone &&
                                          `UTC${formatOffset(offsetMinutes(parsed?.ms ?? now ?? 0, zone))} at this time. Dates without an offset are read in this zone.`}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="date-picker">Pick a date and time</Label>
                                <Input
                                    id="date-picker"
                                    type="datetime-local"
                                    step={1}
                                    value={parsed && zone ? toDatetimeLocal(parsed.ms, zone) : ''}
                                    onChange={(e) => e.target.value && setInput(e.target.value.replace('T', ' '))}
                                />
                            </div>
                        </div>
                    </div>

                    {parsed && now !== null && (
                        <div className="bg-muted/30 border-b px-4 py-3 text-center">
                            <p className="text-lg font-semibold">{relativeTime(parsed.ms, now)}</p>
                        </div>
                    )}
                    <ul className="divide-y">
                        {rows.map((row) => (
                            <Row key={row.label} {...row} />
                        ))}
                        {rows.length === 0 && (
                            <li className="text-muted-foreground px-4 py-8 text-center text-sm">Enter a timestamp or date to convert it.</li>
                        )}
                    </ul>
                </ToolPanel>
            </div>
        </AppLayout>
    );
}
