import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { inspectId, ulid, uuidv7 } from '@/lib/ids';
import { Head } from '@inertiajs/react';
import { CircleAlert, Download, Fingerprint, RefreshCw, ScanSearch } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Kind = 'uuid' | 'ulid';

const MAX_COUNT = 1000;
const PRESETS = [1, 10, 50, 100];

function Inspector() {
    const [value, setValue] = useState('');

    const result = useMemo(() => {
        if (!value.trim()) return null;
        try {
            return { info: inspectId(value), error: null };
        } catch (e) {
            return { info: null, error: (e as Error).message };
        }
    }, [value]);

    return (
        <ToolPanel
            title={
                <span className="flex items-center gap-2">
                    <ScanSearch className="h-4 w-4" /> Inspect an ID
                </span>
            }
        >
            <div className="space-y-3 p-4">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Paste a UUID or ULID to read its timestamp"
                    spellCheck={false}
                    aria-label="ID to inspect"
                    className="font-mono"
                />
                {result?.error && (
                    <p className="text-destructive flex items-center gap-1.5 text-sm">
                        <CircleAlert className="h-4 w-4" /> {result.error}
                    </p>
                )}
                {result?.info && (
                    <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium">
                            {result.info.type}
                            {result.info.version !== undefined && ` v${result.info.version}`}
                        </dd>
                        <dt className="text-muted-foreground">Created</dt>
                        <dd className="font-medium">
                            {result.info.timestamp ? (
                                <>
                                    {result.info.timestamp.toLocaleString()}
                                    <span className="text-muted-foreground block font-mono text-xs">{result.info.timestamp.toISOString()}</span>
                                </>
                            ) : (
                                <span className="text-muted-foreground font-normal">This UUID version has no timestamp.</span>
                            )}
                        </dd>
                    </dl>
                )}
            </div>
        </ToolPanel>
    );
}

export default function IdGenerator() {
    const [kind, setKind] = useState<Kind>('uuid');
    const [count, setCount] = useState(10);
    // UUIDs are conventionally lowercase and ULIDs uppercase; switching type resets to that convention.
    const [lowercase, setLowercase] = useState(true);
    const [hyphens, setHyphens] = useState(true);
    const [ids, setIds] = useState<string[]>([]);

    const generate = useCallback(() => {
        const n = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_COUNT);
        setIds(Array.from({ length: n }, kind === 'uuid' ? uuidv7 : ulid));
    }, [count, kind]);

    useEffect(generate, [generate]);

    const formatted = ids.map((id) => {
        const value = kind === 'uuid' && !hyphens ? id.replace(/-/g, '') : id;
        return lowercase ? value.toLowerCase() : value.toUpperCase();
    });
    const all = formatted.join('\n');

    const download = () => {
        const url = URL.createObjectURL(new Blob([all + '\n'], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kind === 'uuid' ? 'uuid-v7' : 'ulid'}-${formatted.length}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout>
            <Head title="UUID v7 / ULID" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Fingerprint}
                    title="UUID v7 &"
                    highlight="ULID generator"
                    description="Time-ordered, sortable unique IDs, generated with your browser's secure random generator."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <Segmented
                            value={kind}
                            onChange={(value) => {
                                setKind(value);
                                setLowercase(value === 'uuid');
                            }}
                            options={[
                                { value: 'uuid', label: 'UUID v7' },
                                { value: 'ulid', label: 'ULID' },
                            ]}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor="count" className="text-sm">
                                How many
                            </Label>
                            <Input
                                id="count"
                                type="number"
                                min={1}
                                max={MAX_COUNT}
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-24"
                            />
                            {PRESETS.map((preset) => (
                                <Button
                                    key={preset}
                                    type="button"
                                    variant={count === preset ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCount(preset)}
                                >
                                    {preset}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2">
                            <Checkbox id="lowercase" checked={lowercase} onCheckedChange={(checked) => setLowercase(checked === true)} />
                            <Label htmlFor="lowercase" className="text-sm font-normal">
                                Lowercase
                            </Label>
                        </div>
                        {kind === 'uuid' && (
                            <div className="flex items-center gap-2">
                                <Checkbox id="hyphens" checked={hyphens} onCheckedChange={(checked) => setHyphens(checked === true)} />
                                <Label htmlFor="hyphens" className="text-sm font-normal">
                                    Hyphens
                                </Label>
                            </div>
                        )}
                        <Button type="button" onClick={generate} className="sm:ml-auto">
                            <RefreshCw className="h-4 w-4" />
                            Generate
                        </Button>
                    </div>
                </section>

                <ToolPanel
                    title={`${formatted.length.toLocaleString()} ${kind === 'uuid' ? 'UUID v7' : 'ULID'}${formatted.length === 1 ? '' : 's'}`}
                    actions={
                        <>
                            <CopyButton value={all} label="Copy all" />
                            <Button type="button" variant="ghost" size="sm" onClick={download} disabled={!formatted.length}>
                                <Download className="h-4 w-4" />
                                .txt
                            </Button>
                        </>
                    }
                >
                    <ul className="max-h-[28rem] divide-y overflow-y-auto">
                        {formatted.map((id, index) => (
                            <li key={`${index}-${id}`} className="hover:bg-muted/40 flex items-center gap-3 px-4 py-1.5">
                                <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">{index + 1}</span>
                                <code className="min-w-0 flex-1 truncate font-mono text-sm">{id}</code>
                                <CopyButton value={id} title="Copy ID" className="size-8" />
                            </li>
                        ))}
                    </ul>
                </ToolPanel>

                <Inspector />
            </div>
        </AppLayout>
    );
}
