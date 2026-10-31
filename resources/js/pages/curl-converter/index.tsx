import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { editorClass, PanelError, ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { parseCurl, toAxios, toFetch } from '@/lib/curl';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Eraser, Terminal, TriangleAlert, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type Target = 'fetch' | 'axios';

const SAMPLE = `curl -X POST 'https://api.example.com/v1/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '{"name": "Ada Lovelace", "role": "admin"}'`;

export default function CurlConverter() {
    const [input, setInput] = useState('');
    const [target, setTarget] = useState<Target>('fetch');

    const result = useMemo(() => {
        if (!input.trim()) return { code: '', warnings: [] as string[], error: null };
        try {
            const parsed = parseCurl(input);
            return { code: target === 'fetch' ? toFetch(parsed) : toAxios(parsed), warnings: parsed.warnings, error: null };
        } catch (e) {
            return { code: '', warnings: [] as string[], error: (e as Error).message };
        }
    }, [input, target]);

    return (
        <AppLayout>
            <Head title="cURL Converter" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Terminal}
                    title="cURL to"
                    highlight="fetch / axios"
                    description="Paste a cURL command (or just a URL with options; the “curl” part is optional) and get JavaScript code."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="flex justify-center">
                    <Segmented
                        value={target}
                        onChange={setTarget}
                        options={[
                            { value: 'fetch', label: 'fetch' },
                            { value: 'axios', label: 'axios' },
                        ]}
                    />
                </section>

                <section className="grid items-stretch gap-4 lg:grid-cols-2">
                    <ToolPanel
                        title={<Label htmlFor="curl-input">cURL command</Label>}
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
                    >
                        <Textarea
                            id="curl-input"
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                "http://127.0.0.1:8000/curl-converter\n\nor with options:\nhttps://api.example.com/users -H 'Accept: application/json'"
                            }
                            spellCheck={false}
                            className={cn(editorClass, 'min-h-96')}
                        />
                    </ToolPanel>

                    <ToolPanel
                        title={target === 'fetch' ? 'JavaScript (fetch)' : 'JavaScript (axios)'}
                        actions={<CopyButton value={result.code} label="Copy" />}
                        className={cn(result.error && 'border-destructive/50')}
                    >
                        {result.error ? (
                            <PanelError>{result.error}</PanelError>
                        ) : (
                            <Textarea
                                readOnly
                                value={result.code}
                                placeholder="Code appears here"
                                spellCheck={false}
                                aria-label="Generated code"
                                className={cn(editorClass, 'bg-muted/30 min-h-96 whitespace-pre')}
                            />
                        )}
                    </ToolPanel>
                </section>

                {result.warnings.length > 0 && (
                    <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                            <TriangleAlert className="h-4 w-4" />
                            Heads up
                        </p>
                        <ul className="text-muted-foreground list-disc space-y-1 pl-10 text-sm">
                            {result.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
