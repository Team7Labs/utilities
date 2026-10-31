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
import { ArrowDownUp, Binary, Eraser } from 'lucide-react';
import { useMemo, useState } from 'react';

type Mode = 'encode' | 'decode';
type Scope = 'component' | 'full';

function convert(input: string, mode: Mode, scope: Scope, plusForSpace: boolean): { output: string; error: string | null } {
    try {
        if (mode === 'encode') {
            const encoded = scope === 'component' ? encodeURIComponent(input) : encodeURI(input);
            return { output: plusForSpace ? encoded.replace(/%20/g, '+') : encoded, error: null };
        }

        const prepared = plusForSpace ? input.replace(/\+/g, ' ') : input;
        return { output: scope === 'component' ? decodeURIComponent(prepared) : decodeURI(prepared), error: null };
    } catch {
        return {
            output: '',
            error:
                mode === 'decode'
                    ? 'This text has a malformed percent-encoded sequence (e.g. a stray "%").'
                    : 'This text contains characters that cannot be encoded.',
        };
    }
}

export default function UrlEncoder() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<Mode>('encode');
    const [scope, setScope] = useState<Scope>('component');
    const [plusForSpace, setPlusForSpace] = useState(false);

    const { output, error } = useMemo(() => convert(input, mode, scope, plusForSpace), [input, mode, scope, plusForSpace]);

    const swap = () => {
        setInput(output);
        setMode(mode === 'encode' ? 'decode' : 'encode');
    };

    return (
        <AppLayout>
            <Head title="URL Encode / Decode" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={Binary}
                    title="URL"
                    highlight="encode / decode"
                    description="Convert text to and from percent-encoding as you type."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <Segmented
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'encode', label: 'Encode' },
                            { value: 'decode', label: 'Decode' },
                        ]}
                    />
                    <div className="flex flex-wrap items-center gap-4">
                        <Segmented
                            value={scope}
                            onChange={setScope}
                            options={[
                                { value: 'component', label: 'Component' },
                                { value: 'full', label: 'Full URL' },
                            ]}
                        />
                        <div className="flex items-center gap-2">
                            <Checkbox id="plus" checked={plusForSpace} onCheckedChange={(checked) => setPlusForSpace(checked === true)} />
                            <Label htmlFor="plus" className="text-sm font-normal">
                                Spaces as <code className="bg-muted rounded px-1 font-mono">+</code>
                            </Label>
                        </div>
                    </div>
                    <p className="text-muted-foreground basis-full text-xs">
                        {scope === 'component'
                            ? 'Component encodes every reserved character (/ ? & = # …). Use it for query values and path segments.'
                            : 'Full URL keeps URL structure characters (/ ? & = # …) intact. Use it for a whole URL.'}
                    </p>
                </section>

                <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
                    <ToolPanel
                        title={<Label htmlFor="input">{mode === 'encode' ? 'Text' : 'Encoded text'}</Label>}
                        actions={
                            <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                                <Eraser className="h-4 w-4" />
                                Clear
                            </Button>
                        }
                        footer={`${input.length.toLocaleString()} characters`}
                    >
                        <Textarea
                            id="input"
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={mode === 'encode' ? 'https://example.com/search?q=hello world&lang=en' : 'hello%20world%26lang%3Den'}
                            spellCheck={false}
                            className={editorClass}
                        />
                    </ToolPanel>

                    <div className="flex items-center justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={swap}
                            disabled={!output}
                            title="Use output as input and switch mode"
                            className="rounded-full lg:rotate-90"
                        >
                            <ArrowDownUp className="h-4 w-4" />
                        </Button>
                    </div>

                    <ToolPanel
                        title={mode === 'encode' ? 'Encoded text' : 'Text'}
                        actions={<CopyButton value={output} label="Copy" />}
                        footer={`${output.length.toLocaleString()} characters`}
                        className={cn(error && 'border-destructive/50')}
                    >
                        {error ? (
                            <PanelError>{error}</PanelError>
                        ) : (
                            <Textarea
                                readOnly
                                value={output}
                                placeholder="Result appears here"
                                spellCheck={false}
                                aria-label="Result"
                                className={cn(editorClass, 'bg-muted/30 break-all')}
                            />
                        )}
                    </ToolPanel>
                </section>
            </div>
        </AppLayout>
    );
}
