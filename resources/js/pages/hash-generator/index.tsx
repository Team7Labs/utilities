import { CopyButton } from '@/components/copy-button';
import InputError from '@/components/input-error';
import { Segmented } from '@/components/segmented';
import { ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { postJson, ValidationError } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { CircleCheck, CircleX, Eye, EyeOff, Hash, LoaderCircle, ShieldCheck } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

type Tab = 'generate' | 'verify';
type Algorithm = 'bcrypt' | 'argon2id';
type Errors = Record<string, string | undefined>;
type Defaults = { algorithm: Algorithm; cost: number; memory: number; time: number; threads: number };

const MEMORY_OPTIONS = [16, 32, 64, 128, 256];

function errorsFrom(e: unknown): Errors {
    if (e instanceof ValidationError) return Object.fromEntries(Object.entries(e.errors).map(([key, messages]) => [key, messages[0]]));
    return { form: (e as Error).message };
}

function SecretInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Input
                id={id}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono"
            />
            <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                title={visible ? 'Hide' : 'Show'}
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

function RangeField({
    id,
    label,
    hint,
    value,
    min,
    max,
    onChange,
    display,
}: {
    id: string;
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    display?: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between">
                <Label htmlFor={id}>{label}</Label>
                <span className="font-mono text-sm font-medium tabular-nums">{display ?? value}</span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="accent-primary w-full"
            />
            <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
    );
}

function Generate({ defaults }: { defaults: Defaults }) {
    const [algorithm, setAlgorithm] = useState<Algorithm>(defaults.algorithm);
    const [value, setValue] = useState('');
    const [cost, setCost] = useState(defaults.cost);
    // ARGON_MEMORY is in KiB; fall back to 64 MiB if it isn't one of the slider's steps.
    const [memoryIndex, setMemoryIndex] = useState(() => {
        const index = MEMORY_OPTIONS.indexOf(defaults.memory / 1024);
        return index === -1 ? 2 : index;
    });
    const [time, setTime] = useState(defaults.time);
    const [threads, setThreads] = useState(defaults.threads);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [result, setResult] = useState<{ hash: string; milliseconds: number } | null>(null);

    const bytes = new TextEncoder().encode(value).length;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            const options = algorithm === 'bcrypt' ? { cost } : { memory: MEMORY_OPTIONS[memoryIndex] * 1024, time, threads };
            setResult(await postJson('/hash-generator/hash', { algorithm, value, ...options }));
        } catch (err) {
            setErrors(errorsFrom(err));
            setResult(null);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <ToolPanel title="Settings">
                <div className="space-y-6 p-4">
                    <Segmented
                        value={algorithm}
                        onChange={(next) => {
                            setAlgorithm(next);
                            setResult(null);
                        }}
                        options={[
                            { value: 'argon2id', label: 'Argon2id' },
                            { value: 'bcrypt', label: 'bcrypt' },
                        ]}
                    />

                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                            <Label htmlFor="hash-value">Text to hash</Label>
                            {algorithm === 'bcrypt' && (
                                <span className={bytes > 72 ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>{bytes} / 72 bytes</span>
                            )}
                        </div>
                        <SecretInput id="hash-value" value={value} onChange={setValue} placeholder="correct horse battery staple" />
                        <InputError message={errors.value} />
                    </div>

                    {algorithm === 'bcrypt' ? (
                        <RangeField
                            id="cost"
                            label="Cost"
                            hint="Each step doubles the work. 10–12 is typical; Laravel's default is 12."
                            value={cost}
                            min={4}
                            max={14}
                            onChange={setCost}
                        />
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-3">
                            <RangeField
                                id="memory"
                                label="Memory"
                                hint="RAM used per hash."
                                value={memoryIndex}
                                min={0}
                                max={MEMORY_OPTIONS.length - 1}
                                onChange={setMemoryIndex}
                                display={`${MEMORY_OPTIONS[memoryIndex]} MiB`}
                            />
                            <RangeField id="time" label="Iterations" hint="Passes over memory." value={time} min={1} max={10} onChange={setTime} />
                            <RangeField id="threads" label="Parallelism" hint="Threads used." value={threads} min={1} max={4} onChange={setThreads} />
                        </div>
                    )}

                    <InputError message={errors.form ?? errors.cost ?? errors.memory ?? errors.time ?? errors.threads} />

                    <Button type="submit" disabled={processing || !value} className="w-full sm:w-auto">
                        {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                        Generate hash
                    </Button>
                </div>
            </ToolPanel>

            {result && (
                <ToolPanel
                    title="Hash"
                    actions={<CopyButton value={result.hash} label="Copy" />}
                    footer={`Took ${result.milliseconds.toLocaleString()} ms on the server`}
                    className="animate-in fade-in slide-in-from-top-2 duration-300"
                >
                    <p className="bg-muted/30 p-4 font-mono text-sm break-all">{result.hash}</p>
                </ToolPanel>
            )}
        </form>
    );
}

function Verify() {
    const [value, setValue] = useState('');
    const [hash, setHash] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [result, setResult] = useState<{ match: boolean; algorithm: string; options: Record<string, number> } | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            setResult(await postJson('/hash-generator/verify', { value, hash: hash.trim() }));
        } catch (err) {
            setErrors(errorsFrom(err));
            setResult(null);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <ToolPanel title="Check text against a hash">
                <div className="space-y-6 p-4">
                    <div className="space-y-2">
                        <Label htmlFor="verify-value">Text</Label>
                        <SecretInput id="verify-value" value={value} onChange={setValue} placeholder="The original text" />
                        <InputError message={errors.value} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="verify-hash">Hash</Label>
                        <Input
                            id="verify-hash"
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            placeholder="$argon2id$v=19$m=65536,t=4,p=1$… or $2y$12$…"
                            spellCheck={false}
                            className="font-mono"
                        />
                        <InputError message={errors.hash ?? errors.form} />
                    </div>
                    <Button type="submit" disabled={processing || !value || !hash}>
                        {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Verify
                    </Button>
                </div>
            </ToolPanel>

            {result && (
                <div
                    className={
                        result.match
                            ? 'animate-in fade-in flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 duration-300'
                            : 'animate-in fade-in border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-2xl border p-4 duration-300'
                    }
                >
                    {result.match ? (
                        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                        <CircleX className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
                    )}
                    <div className="space-y-1">
                        <p className={result.match ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-destructive font-medium'}>
                            {result.match ? 'Match: the text produces this hash.' : 'No match: the text does not produce this hash.'}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {result.algorithm}
                            {Object.keys(result.options).length > 0 &&
                                ` · ${Object.entries(result.options)
                                    .map(([key, option]) => `${key.replace('_', ' ')} ${option}`)
                                    .join(', ')}`}
                        </p>
                    </div>
                </div>
            )}
        </form>
    );
}

export default function HashGenerator({ defaults }: { defaults: Defaults }) {
    const [tab, setTab] = useState<Tab>('generate');

    return (
        <AppLayout>
            <Head title="Hash Generator" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Hash}
                    title="Hash"
                    highlight="generator"
                    description="Create and verify bcrypt and Argon2id hashes using PHP's native implementation."
                    note="Hashed on the server over your connection. Text and hashes are never stored or logged."
                />

                <div className="flex justify-center">
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'generate', label: 'Generate' },
                            { value: 'verify', label: 'Verify' },
                        ]}
                    />
                </div>

                {tab === 'generate' ? <Generate defaults={defaults} /> : <Verify />}
            </div>
        </AppLayout>
    );
}
