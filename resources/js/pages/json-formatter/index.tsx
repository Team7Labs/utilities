import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { editorClass, PanelError, ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Braces, CircleCheck, CircleX, Eraser, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type Mode = 'format' | 'minify';
type Indent = '2' | '4' | 'tab';

const SAMPLE = '{"name":"Utilities","version":1,"tools":["json","jwt","base64"],"meta":{"public":true,"owner":null}}';

function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, inner]) => [key, sortKeys(inner)]),
        );
    }
    return value;
}

/**
 * Turns a JSON.parse error into a message with line and column, across browser formats.
 */
function describeError(input: string, error: Error): string {
    const message = error.message.replace(/^JSON\.parse: /, '');
    if (/line \d+ column \d+/.test(message)) return message.replace(/ of the JSON data$/, '');

    const position = message.match(/position (\d+)/);
    if (!position) return message;

    const before = input.slice(0, Number(position[1]));
    const line = before.split('\n').length;
    const column = before.length - before.lastIndexOf('\n');
    return `${message} (line ${line}, column ${column})`;
}

function bytes(text: string): string {
    const size = new TextEncoder().encode(text).length;
    return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
}

export default function JsonFormatter() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<Mode>('format');
    const [indent, setIndent] = useState<Indent>('2');
    const [sorted, setSorted] = useState(false);

    const result = useMemo(() => {
        if (!input.trim()) return { output: '', error: null };
        try {
            let parsed = JSON.parse(input);
            if (sorted) parsed = sortKeys(parsed);
            const space = mode === 'minify' ? undefined : indent === 'tab' ? '\t' : Number(indent);
            return { output: JSON.stringify(parsed, null, space), error: null };
        } catch (e) {
            return { output: '', error: describeError(input, e as Error) };
        }
    }, [input, mode, indent, sorted]);

    const valid = input.trim() !== '' && !result.error;

    return (
        <AppLayout>
            <Head title="JSON Formatter" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Braces}
                    title="JSON"
                    highlight="formatter & validator"
                    description="Validate, pretty-print, sort keys and minify JSON as you type."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                            value={mode}
                            onChange={setMode}
                            options={[
                                { value: 'format', label: 'Format' },
                                { value: 'minify', label: 'Minify' },
                            ]}
                        />
                        {mode === 'format' && (
                            <Segmented
                                value={indent}
                                onChange={setIndent}
                                options={[
                                    { value: '2', label: '2 spaces' },
                                    { value: '4', label: '4 spaces' },
                                    { value: 'tab', label: 'Tab' },
                                ]}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="sort" checked={sorted} onCheckedChange={(checked) => setSorted(checked === true)} />
                        <Label htmlFor="sort" className="text-sm font-normal">
                            Sort keys A–Z
                        </Label>
                    </div>
                </section>

                <section className="grid items-stretch gap-4 lg:grid-cols-2">
                    <ToolPanel
                        title={
                            <span className="flex items-center gap-2">
                                <Label htmlFor="json-input">Input</Label>
                                {input.trim() &&
                                    (valid ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                            <CircleCheck className="h-3.5 w-3.5" /> Valid JSON
                                        </span>
                                    ) : (
                                        <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                                            <CircleX className="h-3.5 w-3.5" /> Invalid
                                        </span>
                                    ))}
                            </span>
                        }
                        actions={
                            <>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
                                    <WandSparkles className="h-4 w-4" />
                                    Sample
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                                    <Eraser className="h-4 w-4" />
                                    Clear
                                </Button>
                            </>
                        }
                        footer={`${input.length.toLocaleString()} characters · ${bytes(input)}`}
                    >
                        <Textarea
                            id="json-input"
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='{"paste": "your JSON here"}'
                            spellCheck={false}
                            className={cn(editorClass, 'min-h-96')}
                        />
                    </ToolPanel>

                    <ToolPanel
                        title={mode === 'format' ? 'Formatted' : 'Minified'}
                        actions={<CopyButton value={result.output} label="Copy" />}
                        footer={`${result.output.length.toLocaleString()} characters · ${bytes(result.output)}`}
                        className={cn(result.error && 'border-destructive/50')}
                    >
                        {result.error ? (
                            <PanelError>{result.error}</PanelError>
                        ) : (
                            <Textarea
                                readOnly
                                value={result.output}
                                placeholder="Result appears here"
                                spellCheck={false}
                                aria-label="Result"
                                className={cn(editorClass, 'bg-muted/30 min-h-96 whitespace-pre')}
                            />
                        )}
                    </ToolPanel>
                </section>
            </div>
        </AppLayout>
    );
}
