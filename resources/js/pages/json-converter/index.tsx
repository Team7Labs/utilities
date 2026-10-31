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
import { type ConvertOptions, type Delimiter, type Format, formatOutput, parseInput } from '@/lib/data-convert';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { ArrowLeftRight, Eraser, FileCode, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type Source = Exclude<Format, 'typescript'>;

const FORMAT_LABELS: Record<Format, string> = { json: 'JSON', yaml: 'YAML', csv: 'CSV', typescript: 'TypeScript' };

const SAMPLES: Record<Source, string> = {
    json: JSON.stringify(
        {
            id: 42,
            name: 'Ada Lovelace',
            active: true,
            tags: ['math', 'engines'],
            address: { city: 'London', postcode: null },
            projects: [
                { title: 'Analytical Engine', year: 1843 },
                { title: 'Notes', year: 1843, pages: 65 },
            ],
        },
        null,
        2,
    ),
    yaml: 'id: 42\nname: Ada Lovelace\nactive: true\ntags:\n  - math\n  - engines\naddress:\n  city: London\n  postcode: null\n',
    csv: 'id,name,active,address.city\n1,Ada Lovelace,true,London\n2,"Grace Hopper, RADM",false,New York\n',
};

const DELIMITERS: { value: Delimiter; label: string }[] = [
    { value: ',', label: 'Comma' },
    { value: ';', label: 'Semicolon' },
    { value: '\t', label: 'Tab' },
];

export default function JsonConverter() {
    const [input, setInput] = useState('');
    const [from, setFrom] = useState<Source>('json');
    const [to, setTo] = useState<Format>('typescript');
    const [options, setOptions] = useState<ConvertOptions>({ delimiter: ',', inferTypes: true, rootName: 'Root' });
    const set = <K extends keyof ConvertOptions>(key: K, value: ConvertOptions[K]) => setOptions((current) => ({ ...current, [key]: value }));

    const result = useMemo(() => {
        if (!input.trim()) return { output: '', error: null };
        try {
            return { output: formatOutput(parseInput(input, from, options), to, options), error: null };
        } catch (e) {
            return { output: '', error: (e as Error).message };
        }
    }, [input, from, to, options]);

    const canSwap = to !== 'typescript';
    const swap = () => {
        if (!canSwap) return;
        setFrom(to);
        setTo(from);
        if (!result.error) setInput(result.output);
    };

    return (
        <AppLayout>
            <Head title="JSON Converter" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={FileCode}
                    title="JSON"
                    highlight="converter"
                    description="Convert between JSON, YAML and CSV, or generate TypeScript interfaces from sample JSON."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                            value={from}
                            onChange={setFrom}
                            options={(['json', 'yaml', 'csv'] as const).map((value) => ({ value, label: FORMAT_LABELS[value] }))}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={swap}
                            disabled={!canSwap}
                            title={canSwap ? 'Swap formats and use the output as input' : 'TypeScript can only be an output'}
                            className="rounded-full"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                        <Segmented
                            value={to}
                            onChange={setTo}
                            options={(['json', 'yaml', 'csv', 'typescript'] as const).map((value) => ({ value, label: FORMAT_LABELS[value] }))}
                        />
                    </div>

                    {(from === 'csv' || to === 'csv' || to === 'typescript') && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            {(from === 'csv' || to === 'csv') && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm">Delimiter</Label>
                                    <Segmented value={options.delimiter} onChange={(value) => set('delimiter', value)} options={DELIMITERS} />
                                </div>
                            )}
                            {from === 'csv' && (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="infer"
                                        checked={options.inferTypes}
                                        onCheckedChange={(checked) => set('inferTypes', checked === true)}
                                    />
                                    <Label htmlFor="infer" className="text-sm font-normal">
                                        Detect numbers, booleans and null
                                    </Label>
                                </div>
                            )}
                            {to === 'typescript' && (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="root-name" className="text-sm">
                                        Root type name
                                    </Label>
                                    <Input
                                        id="root-name"
                                        value={options.rootName}
                                        onChange={(e) => set('rootName', e.target.value)}
                                        placeholder="Root"
                                        spellCheck={false}
                                        className="w-40 font-mono"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className="grid items-stretch gap-4 lg:grid-cols-2">
                    <ToolPanel
                        title={<Label htmlFor="convert-input">{FORMAT_LABELS[from]}</Label>}
                        actions={
                            <>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setInput(SAMPLES[from])}>
                                    <WandSparkles className="h-4 w-4" />
                                    Sample
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                                    <Eraser className="h-4 w-4" />
                                    Clear
                                </Button>
                            </>
                        }
                        footer={`${input.length.toLocaleString()} characters`}
                    >
                        <Textarea
                            id="convert-input"
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Paste ${FORMAT_LABELS[from]} here`}
                            spellCheck={false}
                            className={cn(editorClass, 'min-h-96 whitespace-pre')}
                        />
                    </ToolPanel>

                    <ToolPanel
                        title={FORMAT_LABELS[to]}
                        actions={<CopyButton value={result.output} label="Copy" />}
                        footer={`${result.output.length.toLocaleString()} characters`}
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
