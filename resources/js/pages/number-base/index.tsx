import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type Base, BASES, bitLength, bitwise, formatInteger, type Operation, OPERATIONS, parseInteger, toBits, type Width } from '@/lib/number-base';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { ArrowUp, Calculator, CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

const WIDTHS: Width[] = [8, 16, 32, 64];

function tryParse(text: string, base?: Base) {
    try {
        return { value: parseInteger(text, base), error: null };
    } catch (e) {
        return { value: null, error: (e as Error).message };
    }
}

interface ConverterState {
    source: Base;
    text: string;
    value: bigint;
}

function Converter({ state, setState }: { state: ConverterState; setState: (state: ConverterState) => void }) {
    const [uppercase, setUppercase] = useState(false);
    const error = useMemo(() => tryParse(state.text, state.source).error, [state]);

    const edit = (base: Base, text: string) => {
        const parsed = tryParse(text, base);
        setState({ source: base, text, value: parsed.value ?? state.value });
    };

    const bits = bitLength(state.value);

    return (
        <ToolPanel
            title="Convert"
            actions={
                <div className="flex items-center gap-2 pr-1">
                    <Checkbox id="uppercase" checked={uppercase} onCheckedChange={(checked) => setUppercase(checked === true)} />
                    <Label htmlFor="uppercase" className="text-sm font-normal">
                        Uppercase hex
                    </Label>
                </div>
            }
            footer={
                error
                    ? undefined
                    : `${bits.toLocaleString()} bit${bits === 1 ? '' : 's'} · ${Math.ceil(bits / 8).toLocaleString()} byte${bits > 8 ? 's' : ''}`
            }
        >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
                {BASES.map(({ base, label, prefix }) => {
                    const isSource = state.source === base;
                    const value = isSource ? state.text : formatInteger(state.value, base, { uppercase });
                    return (
                        <div key={base} className="space-y-1.5">
                            <Label htmlFor={`base-${base}`} className="flex items-center gap-2">
                                {label}
                                <span className="text-muted-foreground font-mono text-xs font-normal">base {base}</span>
                            </Label>
                            <div className="flex gap-1">
                                <div
                                    className={cn(
                                        'focus-within:ring-ring/50 flex min-w-0 flex-1 items-center rounded-md border shadow-xs focus-within:ring-[3px]',
                                        isSource && error && 'border-destructive/50',
                                    )}
                                >
                                    {prefix && <span className="text-muted-foreground pl-3 font-mono text-sm select-none">{prefix}</span>}
                                    <input
                                        id={`base-${base}`}
                                        value={value}
                                        onChange={(e) => edit(base, e.target.value)}
                                        spellCheck={false}
                                        autoComplete="off"
                                        autoFocus={base === 10}
                                        className={cn('h-9 w-full min-w-0 bg-transparent px-3 font-mono text-sm outline-none', prefix && 'pl-1')}
                                    />
                                </div>
                                <CopyButton value={isSource && error ? '' : value} title={`Copy ${label.toLowerCase()}`} />
                            </div>
                            {isSource && error && (
                                <p className="text-destructive flex items-center gap-1.5 text-xs">
                                    <CircleAlert className="h-3.5 w-3.5" /> {error}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </ToolPanel>
    );
}

function BitRow({ label, bits, highlight }: { label: string; bits: string; highlight?: boolean }) {
    return (
        <div className={cn('flex items-baseline gap-3 whitespace-nowrap', highlight && 'text-primary font-semibold')}>
            <span className="text-muted-foreground w-8 shrink-0 text-right text-xs">{label}</span>
            <code className="font-mono text-sm tracking-wider">{bits}</code>
        </div>
    );
}

function Bitwise({ onUse }: { onUse: (value: bigint) => void }) {
    const [width, setWidth] = useState<Width>(32);
    const [operation, setOperation] = useState<Operation>('and');
    const [a, setA] = useState('0b1100');
    const [b, setB] = useState('0b1010');

    const op = OPERATIONS.find((o) => o.value === operation)!;
    const isShift = operation === 'shl' || operation === 'shr';
    const parsedA = useMemo(() => tryParse(a), [a]);
    const parsedB = useMemo(() => tryParse(b), [b]);

    const result = useMemo(() => {
        if (parsedA.value === null || (!op.unary && parsedB.value === null)) return null;
        try {
            return { value: bitwise(operation, parsedA.value, parsedB.value ?? 0n, width), error: null };
        } catch (e) {
            return { value: null, error: (e as Error).message };
        }
    }, [operation, op.unary, parsedA.value, parsedB.value, width]);

    const value = result?.value ?? null;
    const outputs =
        value === null
            ? []
            : [
                  { label: 'Decimal', value: value.toString() },
                  { label: 'Signed', value: BigInt.asIntN(width, value).toString() },
                  { label: 'Hex', value: '0x' + value.toString(16).padStart(width / 4, '0') },
                  { label: 'Binary', value: '0b' + value.toString(2).padStart(width, '0') },
                  { label: 'Octal', value: '0o' + value.toString(8) },
              ];

    const operand = (id: string, label: string, text: string, setText: (value: string) => void, error: string | null) => (
        <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className={cn('font-mono', error && 'border-destructive/50')}
            />
            {error && (
                <p className="text-destructive flex items-center gap-1.5 text-xs">
                    <CircleAlert className="h-3.5 w-3.5" /> {error}
                </p>
            )}
        </div>
    );

    return (
        <ToolPanel title="Bitwise operations">
            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented value={operation} onChange={setOperation} options={OPERATIONS.map((o) => ({ value: o.value, label: o.label }))} />
                    <Segmented
                        value={String(width)}
                        onChange={(w) => setWidth(Number(w) as Width)}
                        options={WIDTHS.map((w) => ({ value: String(w), label: `${w}-bit` }))}
                    />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    {operand('operand-a', 'A', a, setA, parsedA.error)}
                    {!op.unary && operand('operand-b', isShift ? 'Shift by' : 'B', b, setB, parsedB.error)}
                </div>
                <p className="text-muted-foreground -mt-2 text-xs">
                    Decimal by default, or prefix with <code className="font-mono">0x</code>, <code className="font-mono">0b</code> or{' '}
                    <code className="font-mono">0o</code>. Negative numbers use two’s complement and <code className="font-mono">&gt;&gt;</code> is a
                    logical shift.
                </p>

                {result?.error && (
                    <p className="text-destructive flex items-center gap-1.5 text-sm">
                        <CircleAlert className="h-4 w-4" /> {result.error}
                    </p>
                )}

                {value !== null && parsedA.value !== null && (
                    <>
                        <div className="bg-muted/30 space-y-1 overflow-x-auto rounded-xl border p-3">
                            <BitRow label="A" bits={toBits(parsedA.value, width)} />
                            {!op.unary && !isShift && parsedB.value !== null && <BitRow label="B" bits={toBits(parsedB.value, width)} />}
                            <div className="border-t" />
                            <BitRow
                                label={op.unary ? '~A' : isShift ? `${op.symbol} ${parsedB.value}` : op.symbol}
                                bits={toBits(value, width)}
                                highlight
                            />
                        </div>

                        <ul className="divide-y rounded-xl border">
                            {outputs.map((output) => (
                                <li key={output.label} className="flex items-center gap-3 py-1 pr-1 pl-3">
                                    <span className="text-muted-foreground w-16 shrink-0 text-xs font-semibold">{output.label}</span>
                                    <code className="min-w-0 flex-1 truncate font-mono text-sm select-all">{output.value}</code>
                                    <CopyButton value={output.value} title={`Copy ${output.label.toLowerCase()}`} className="size-8" />
                                </li>
                            ))}
                        </ul>

                        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onUse(value)}>
                            <ArrowUp className="h-4 w-4" />
                            Use result in converter
                        </Button>
                    </>
                )}
            </div>
        </ToolPanel>
    );
}

export default function NumberBase() {
    const [state, setState] = useState<ConverterState>({ source: 10, text: '255', value: 255n });

    return (
        <AppLayout>
            <Head title="Number Base Converter" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Calculator}
                    title="Number base"
                    highlight="converter"
                    description="Convert between decimal, hex, binary and octal at any size, and try out bitwise operations."
                    note={BROWSER_ONLY_NOTE}
                />
                <Converter state={state} setState={setState} />
                <Bitwise
                    onUse={(value) => {
                        setState({ source: 10, text: value.toString(), value });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            </div>
        </AppLayout>
    );
}
