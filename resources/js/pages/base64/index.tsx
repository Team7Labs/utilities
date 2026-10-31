import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { editorClass, PanelError, ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { base64ToBytes, base64ToText, bytesToBase64, formatBytes, sniffType, textToBase64 } from '@/lib/base64';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { ArrowDownUp, Download, Eraser, FileCode2, FileUp, LoaderCircle, X } from 'lucide-react';
import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';

type Kind = 'text' | 'file';
type Mode = 'encode' | 'decode';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function TextMode({ mode, setMode, urlSafe }: { mode: Mode; setMode: (mode: Mode) => void; urlSafe: boolean }) {
    const [input, setInput] = useState('');

    const result = useMemo(() => {
        if (!input) return { output: '', error: null };
        try {
            return { output: mode === 'encode' ? textToBase64(input, urlSafe) : base64ToText(input), error: null };
        } catch (e) {
            return { output: '', error: (e as Error).message };
        }
    }, [input, mode, urlSafe]);

    const swap = () => {
        setInput(result.output);
        setMode(mode === 'encode' ? 'decode' : 'encode');
    };

    return (
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <ToolPanel
                title={<Label htmlFor="b64-input">{mode === 'encode' ? 'Text' : 'Base64'}</Label>}
                actions={
                    <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                        <Eraser className="h-4 w-4" />
                        Clear
                    </Button>
                }
                footer={`${input.length.toLocaleString()} characters`}
            >
                <Textarea
                    id="b64-input"
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={mode === 'encode' ? 'Hello, world! 👋' : 'SGVsbG8sIHdvcmxkISDwn5GL'}
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
                    disabled={!result.output}
                    title="Use output as input and switch mode"
                    className="rounded-full lg:rotate-90"
                >
                    <ArrowDownUp className="h-4 w-4" />
                </Button>
            </div>

            <ToolPanel
                title={mode === 'encode' ? 'Base64' : 'Text'}
                actions={<CopyButton value={result.output} label="Copy" />}
                footer={`${result.output.length.toLocaleString()} characters`}
                className={cn(result.error && 'border-destructive/50')}
            >
                {result.error ? (
                    <PanelError>
                        {result.error}
                        {mode === 'decode' && ' Switch to File mode to download it.'}
                    </PanelError>
                ) : (
                    <Textarea
                        readOnly
                        value={result.output}
                        placeholder="Result appears here"
                        spellCheck={false}
                        aria-label="Result"
                        className={cn(editorClass, 'bg-muted/30 break-all')}
                    />
                )}
            </ToolPanel>
        </section>
    );
}

function FileEncode({ urlSafe }: { urlSafe: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [base64, setBase64] = useState('');
    const [dataUri, setDataUri] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

    const load = async (selected: File | undefined) => {
        if (!selected) return;
        setError(null);
        setBase64('');
        if (selected.size > MAX_FILE_SIZE) {
            setFile(null);
            setError(`That file is ${formatBytes(selected.size)}. The limit is ${formatBytes(MAX_FILE_SIZE)}.`);
            return;
        }
        setLoading(true);
        setFile(selected);
        setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null);
        setBase64(bytesToBase64(new Uint8Array(await selected.arrayBuffer())));
        setLoading(false);
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        load(e.dataTransfer.files[0]);
    };

    const output = !base64
        ? ''
        : dataUri
          ? `data:${file?.type || 'application/octet-stream'};base64,${base64}`
          : urlSafe
            ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
            : base64;

    return (
        <section className="grid items-stretch gap-4 lg:grid-cols-2">
            <ToolPanel
                title="File"
                actions={
                    file && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFile(null);
                                setBase64('');
                                setPreview(null);
                                if (inputRef.current) inputRef.current.value = '';
                            }}
                        >
                            <X className="h-4 w-4" />
                            Remove
                        </Button>
                    )
                }
            >
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'hover:border-primary/50 hover:bg-accent/50 flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                            dragging && 'border-primary bg-accent',
                        )}
                    >
                        {preview ? (
                            <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" />
                        ) : (
                            <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-2xl">
                                <FileUp className="h-6 w-6" />
                            </div>
                        )}
                        {file ? (
                            <div className="min-w-0">
                                <p className="truncate font-medium">{file.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {formatBytes(file.size)} · {file.type || 'unknown type'}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-medium">Drop a file here, or click to choose</p>
                                <p className="text-muted-foreground text-xs">Up to {formatBytes(MAX_FILE_SIZE)}</p>
                            </div>
                        )}
                    </button>
                    <input ref={inputRef} type="file" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
                    <div className="flex items-center gap-2">
                        <Checkbox id="data-uri" checked={dataUri} onCheckedChange={(checked) => setDataUri(checked === true)} />
                        <Label htmlFor="data-uri" className="text-sm font-normal">
                            Output as data URI (<code className="bg-muted rounded px-1 font-mono text-xs">data:…;base64,</code>)
                        </Label>
                    </div>
                </div>
            </ToolPanel>

            <ToolPanel
                title="Base64"
                actions={<CopyButton value={output} label="Copy" />}
                footer={`${output.length.toLocaleString()} characters`}
                className={cn(error && 'border-destructive/50')}
            >
                {error ? (
                    <PanelError>{error}</PanelError>
                ) : loading ? (
                    <div className="text-muted-foreground flex min-h-64 flex-1 items-center justify-center gap-2 text-sm">
                        <LoaderCircle className="h-4 w-4 animate-spin" /> Encoding…
                    </div>
                ) : (
                    <Textarea
                        readOnly
                        value={output}
                        placeholder="Choose a file to encode it"
                        spellCheck={false}
                        aria-label="Base64 output"
                        className={cn(editorClass, 'bg-muted/30 break-all')}
                    />
                )}
            </ToolPanel>
        </section>
    );
}

interface DecodedFile {
    bytes: Uint8Array<ArrayBuffer>;
    mime: string;
    ext: string;
    error: null;
}

function FileDecode() {
    const [input, setInput] = useState('');
    const [filename, setFilename] = useState('');

    const result = useMemo((): DecodedFile | { error: string } | null => {
        const trimmed = input.trim();
        if (!trimmed) return null;
        try {
            const match = trimmed.match(/^data:([^;,]*)(;[^,]*)?,(.*)$/s);
            const bytes = base64ToBytes(match ? match[3] : trimmed);
            const sniffed = sniffType(bytes);
            return { bytes, mime: match?.[1] || sniffed.mime, ext: sniffed.ext, error: null };
        } catch (e) {
            return { error: (e as Error).message };
        }
    }, [input]);

    const blobUrl = useMemo(
        () => (result && result.error === null ? URL.createObjectURL(new Blob([result.bytes], { type: result.mime })) : null),
        [result],
    );
    useEffect(() => () => void (blobUrl && URL.revokeObjectURL(blobUrl)), [blobUrl]);

    return (
        <section className="grid items-stretch gap-4 lg:grid-cols-2">
            <ToolPanel
                title={<Label htmlFor="b64-file-input">Base64 or data URI</Label>}
                actions={
                    <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                        <Eraser className="h-4 w-4" />
                        Clear
                    </Button>
                }
                footer={`${input.length.toLocaleString()} characters`}
            >
                <Textarea
                    id="b64-file-input"
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="iVBORw0KGgoAAAANSUhEUgAA… or data:image/png;base64,…"
                    spellCheck={false}
                    className={cn(editorClass, 'break-all')}
                />
            </ToolPanel>

            <ToolPanel title="File" className={cn(result?.error && 'border-destructive/50')}>
                {!result ? (
                    <div className="text-muted-foreground flex min-h-64 flex-1 items-center justify-center p-6 text-center text-sm">
                        Paste Base64 to turn it back into a file.
                    </div>
                ) : result.error !== null ? (
                    <PanelError>{result.error}</PanelError>
                ) : (
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="bg-muted/30 flex min-h-48 flex-1 items-center justify-center rounded-xl border p-4">
                            {result.mime.startsWith('image/') && blobUrl ? (
                                <img src={blobUrl} alt="Decoded preview" className="max-h-64 rounded-lg object-contain" />
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
                                    <FileCode2 className="h-8 w-8" />
                                    No preview for this file type
                                </div>
                            )}
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                            <dt className="text-muted-foreground">Size</dt>
                            <dd className="text-right font-medium tabular-nums">{formatBytes(result.bytes.length)}</dd>
                            <dt className="text-muted-foreground">Type</dt>
                            <dd className="truncate text-right font-mono text-xs leading-5">{result.mime}</dd>
                        </dl>
                        <div className="flex gap-2">
                            <Input
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder={`file.${result.ext}`}
                                aria-label="File name"
                            />
                            <Button asChild>
                                <a href={blobUrl ?? undefined} download={filename || `file.${result.ext}`}>
                                    <Download className="h-4 w-4" />
                                    Download
                                </a>
                            </Button>
                        </div>
                    </div>
                )}
            </ToolPanel>
        </section>
    );
}

export default function Base64() {
    const [kind, setKind] = useState<Kind>('text');
    const [mode, setMode] = useState<Mode>('encode');
    const [urlSafe, setUrlSafe] = useState(false);

    return (
        <AppLayout>
            <Head title="Base64" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={FileCode2}
                    title="Base64"
                    highlight="encode / decode"
                    description="Convert text or files to Base64 and back. Unicode-safe."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                            value={kind}
                            onChange={setKind}
                            options={[
                                { value: 'text', label: 'Text' },
                                { value: 'file', label: 'File' },
                            ]}
                        />
                        <Segmented
                            value={mode}
                            onChange={setMode}
                            options={[
                                { value: 'encode', label: 'Encode' },
                                { value: 'decode', label: 'Decode' },
                            ]}
                        />
                    </div>
                    {mode === 'encode' && (
                        <div className="flex items-center gap-2">
                            <Checkbox id="url-safe" checked={urlSafe} onCheckedChange={(checked) => setUrlSafe(checked === true)} />
                            <Label htmlFor="url-safe" className="text-sm font-normal">
                                URL-safe (<code className="bg-muted rounded px-1 font-mono text-xs">-_</code>, no padding)
                            </Label>
                        </div>
                    )}
                </section>

                {kind === 'text' ? (
                    <TextMode mode={mode} setMode={setMode} urlSafe={urlSafe} />
                ) : mode === 'encode' ? (
                    <FileEncode urlSafe={urlSafe} />
                ) : (
                    <FileDecode />
                )}
            </div>
        </AppLayout>
    );
}
