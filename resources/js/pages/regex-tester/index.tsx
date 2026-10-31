import { CopyButton } from '@/components/copy-button';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { MAX_MATCHES, type RegexMatch, type RegexRequest, type RegexResponse } from '@/lib/regex';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { CircleAlert, LoaderCircle, Regex } from 'lucide-react';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const FLAGS = [
    { flag: 'g', label: 'global', hint: 'Find all matches, not just the first' },
    { flag: 'i', label: 'ignore case', hint: 'Case-insensitive' },
    { flag: 'm', label: 'multiline', hint: '^ and $ match at line breaks' },
    { flag: 's', label: 'dotAll', hint: '. matches newlines too' },
    { flag: 'u', label: 'unicode', hint: 'Unicode code points and \\p{…} classes' },
    { flag: 'y', label: 'sticky', hint: 'Match only at lastIndex (0)' },
];

const TIMEOUT_MS = 2000;
const DEBOUNCE_MS = 120;

const REFERENCE: [string, string][] = [
    ['.', 'Any character except newline'],
    ['\\d \\w \\s', 'Digit, word character, whitespace'],
    ['\\D \\W \\S', 'Not digit, word, whitespace'],
    ['[abc] [^abc]', 'Any of / none of a, b, c'],
    ['^ $', 'Start / end of input (or line with m)'],
    ['\\b', 'Word boundary'],
    ['* + ?', '0 or more, 1 or more, 0 or 1'],
    ['{2,5}', 'Between 2 and 5 times'],
    ['*? +?', 'Lazy: as few as possible'],
    ['(…) (?:…)', 'Capturing / non-capturing group'],
    ['(?<name>…)', 'Named group'],
    ['(?=…) (?!…)', 'Followed by / not followed by'],
    ['(?<=…) (?<!…)', 'Preceded by / not preceded by'],
    ['$1 $<name> $&', 'In replacements: group, named group, whole match'],
];

type Result = RegexResponse | { ok: false; timeout: true } | null;

/**
 * Runs the regex in a worker, restarting the worker if a pattern runs for longer than TIMEOUT_MS.
 */
function useRegex(request: Omit<RegexRequest, 'id'>): { result: Result; running: boolean } {
    const [result, setResult] = useState<Result>(null);
    const [running, setRunning] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const idRef = useRef(0);

    useEffect(() => () => workerRef.current?.terminate(), []);

    useEffect(() => {
        if (!request.pattern) {
            setResult(null);
            return;
        }
        const id = ++idRef.current;
        let timeout: ReturnType<typeof setTimeout>;

        const debounce = setTimeout(() => {
            if (!workerRef.current) {
                workerRef.current = new Worker(new URL('../../lib/regex.worker.ts', import.meta.url), { type: 'module' });
            }
            const worker = workerRef.current;
            worker.onmessage = (event: MessageEvent<RegexResponse>) => {
                if (event.data.id !== idRef.current) return;
                clearTimeout(timeout);
                setResult(event.data);
                setRunning(false);
            };
            timeout = setTimeout(() => {
                worker.terminate();
                workerRef.current = null;
                setResult({ ok: false, timeout: true });
                setRunning(false);
            }, TIMEOUT_MS);
            // The previous result stays on screen until this one arrives.
            setRunning(true);
            worker.postMessage({ ...request, id });
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(debounce);
            clearTimeout(timeout);
        };
    }, [request.pattern, request.flags, request.text, request.replacement]); // eslint-disable-line react-hooks/exhaustive-deps

    return { result, running };
}

const MATCH_COLORS = ['bg-primary/25', 'bg-amber-400/40 dark:bg-amber-400/30'];

/** The test text with matches wrapped in marks, drawn behind a transparent textarea. */
function highlight(text: string, matches: RegexMatch[]): ReactNode[] {
    const nodes: ReactNode[] = [];
    let position = 0;
    matches.forEach((match, i) => {
        if (match.start < position) return;
        nodes.push(text.slice(position, match.start));
        nodes.push(
            match.start === match.end ? (
                // Empty matches get a thin marker so they're still visible.
                <span key={i} className="border-primary -mx-px border-l-2" />
            ) : (
                <mark key={i} className={cn('rounded-sm text-transparent', MATCH_COLORS[i % 2])}>
                    {text.slice(match.start, match.end)}
                </mark>
            ),
        );
        position = match.end;
    });
    nodes.push(text.slice(position));
    // A trailing newline needs something after it to take up a line.
    nodes.push(' ');
    return nodes;
}

function HighlightEditor({ value, onChange, matches }: { value: string; onChange: (value: string) => void; matches: RegexMatch[] }) {
    const ref = useRef<HTMLTextAreaElement>(null);

    // Grow with the content instead of scrolling, so the highlight layer never drifts out of line.
    useLayoutEffect(() => {
        const textarea = ref.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [value]);

    const shared = 'min-h-48 w-full p-4 font-mono text-sm leading-6 break-words whitespace-pre-wrap';
    return (
        <div className="relative">
            <div aria-hidden className={cn(shared, 'pointer-events-none absolute inset-0 overflow-hidden text-transparent')}>
                {highlight(value, matches)}
            </div>
            <textarea
                ref={ref}
                id="regex-text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
                placeholder="Text to test against"
                className={cn(shared, 'placeholder:text-muted-foreground relative block resize-none overflow-hidden bg-transparent outline-none')}
            />
        </div>
    );
}

function MatchList({ matches, truncated }: { matches: RegexMatch[]; truncated: boolean }) {
    if (!matches.length) return <p className="text-muted-foreground px-4 py-8 text-center text-sm">No matches.</p>;
    return (
        <ul className="max-h-[32rem] divide-y overflow-y-auto">
            {matches.map((match, i) => (
                <li key={i} className="space-y-1.5 px-4 py-2.5">
                    <div className="flex items-baseline gap-3">
                        <span className="text-muted-foreground w-8 shrink-0 text-xs font-semibold tabular-nums">#{i + 1}</span>
                        <code className={cn('min-w-0 flex-1 rounded px-1.5 font-mono text-sm break-all', MATCH_COLORS[i % 2])}>
                            {match.value || <span className="text-muted-foreground italic">empty</span>}
                        </code>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {match.start}–{match.end}
                        </span>
                    </div>
                    {match.groups.length > 0 && (
                        <dl className="ml-11 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                            {match.groups.map((group) => (
                                <div key={group.index} className="contents">
                                    <dt className="text-muted-foreground font-mono">
                                        {group.index}
                                        {group.name && <span className="text-primary"> {group.name}</span>}
                                    </dt>
                                    <dd className="min-w-0 font-mono break-all">
                                        {group.value === undefined ? (
                                            <span className="text-muted-foreground italic">not matched</span>
                                        ) : (
                                            group.value || <span className="text-muted-foreground italic">empty</span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </li>
            ))}
            {truncated && (
                <li className="text-muted-foreground px-4 py-2 text-center text-xs">Showing the first {MAX_MATCHES.toLocaleString()} matches.</li>
            )}
        </ul>
    );
}

export default function RegexTester() {
    const [pattern, setPattern] = useState('(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.]+)');
    const [flags, setFlags] = useState('g');
    const [text, setText] = useState('Contact ada@example.com or grace.hopper@navy.mil.\nInvalid: not-an-email@, @nope.com');
    const [replacement, setReplacement] = useState('$<user> at $<domain>');

    const request = useMemo(() => ({ pattern, flags, text, replacement }), [pattern, flags, text, replacement]);
    const { result, running } = useRegex(request);
    const shown = result?.ok ? result : null;
    const error =
        result && !result.ok
            ? 'timeout' in result
                ? `Stopped after ${TIMEOUT_MS / 1000} seconds. The pattern is probably backtracking catastrophically, like (a+)+$.`
                : result.error
            : null;
    const toggleFlag = (flag: string) =>
        setFlags((current) =>
            current.includes(flag)
                ? current.replace(flag, '')
                : FLAGS.map((f) => f.flag)
                      .filter((f) => current.includes(f) || f === flag)
                      .join(''),
        );
    const literal = shown ? `/${shown.source}/${flags}` : '';

    return (
        <AppLayout>
            <Head title="Regex Tester" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Regex}
                    title="Regex"
                    highlight="tester"
                    description="Test JavaScript regular expressions with live highlighting, capture groups and a replace preview."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="regex-pattern" className="sr-only">
                            Pattern
                        </Label>
                        <div
                            className={cn(
                                'focus-within:border-primary/50 focus-within:ring-primary/15 flex min-w-0 flex-1 items-center rounded-xl border px-3 font-mono transition focus-within:ring-4',
                                error && 'border-destructive/50',
                            )}
                        >
                            <span className="text-muted-foreground select-none">/</span>
                            <input
                                id="regex-pattern"
                                autoFocus
                                value={pattern}
                                onChange={(e) => setPattern(e.target.value)}
                                placeholder="pattern"
                                spellCheck={false}
                                autoComplete="off"
                                className="placeholder:text-muted-foreground h-11 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
                            />
                            <span className="text-muted-foreground select-none">/{flags}</span>
                        </div>
                        <CopyButton value={literal} title="Copy as JavaScript literal" />
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Flags">
                        {FLAGS.map(({ flag, label, hint }) => (
                            <button
                                key={flag}
                                type="button"
                                aria-pressed={flags.includes(flag)}
                                onClick={() => toggleFlag(flag)}
                                title={hint}
                                className={cn(
                                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                                    flags.includes(flag)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <span className="font-mono font-semibold">{flag}</span> {label}
                            </button>
                        ))}
                    </div>
                    {error && (
                        <p className="text-destructive flex items-center gap-1.5 text-sm">
                            <CircleAlert className="h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}
                </section>

                <section className="grid items-start gap-4 lg:grid-cols-[1fr_24rem]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <ToolPanel
                            title={<Label htmlFor="regex-text">Test string</Label>}
                            actions={running && <LoaderCircle className="text-muted-foreground h-4 w-4 animate-spin" />}
                            footer={`${text.length.toLocaleString()} characters`}
                        >
                            <HighlightEditor value={text} onChange={setText} matches={shown?.matches ?? []} />
                        </ToolPanel>

                        <ToolPanel title="Replace" actions={<CopyButton value={shown?.replaced ?? ''} label="Copy" />}>
                            <div className="border-b p-3">
                                <Input
                                    value={replacement}
                                    onChange={(e) => setReplacement(e.target.value)}
                                    placeholder="Replacement, e.g. $1 or $<name>"
                                    spellCheck={false}
                                    aria-label="Replacement"
                                    className="font-mono"
                                />
                            </div>
                            <pre className="bg-muted/30 min-h-24 p-4 font-mono text-sm leading-6 break-words whitespace-pre-wrap">
                                {shown?.replaced}
                            </pre>
                        </ToolPanel>
                    </div>

                    <div className="flex min-w-0 flex-col gap-4">
                        <ToolPanel
                            title={
                                <span className="flex items-center gap-2">
                                    Matches
                                    {shown && (
                                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs tabular-nums">
                                            {shown.matches.length.toLocaleString()}
                                            {shown.truncated && '+'}
                                        </span>
                                    )}
                                </span>
                            }
                        >
                            {shown ? (
                                <MatchList matches={shown.matches} truncated={shown.truncated} />
                            ) : (
                                <p className="text-muted-foreground px-4 py-8 text-center text-sm">{pattern ? '–' : 'Enter a pattern.'}</p>
                            )}
                        </ToolPanel>

                        <ToolPanel title="Quick reference">
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-4 text-xs">
                                {REFERENCE.map(([token, meaning]) => (
                                    <div key={token} className="contents">
                                        <dt className="font-mono font-semibold whitespace-nowrap">{token}</dt>
                                        <dd className="text-muted-foreground">{meaning}</dd>
                                    </div>
                                ))}
                            </dl>
                        </ToolPanel>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
