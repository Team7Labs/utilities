import { CopyButton } from '@/components/copy-button';
import { Segmented } from '@/components/segmented';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { CASE_STYLES, convertLines, slugify, type SlugOptions, splitWords } from '@/lib/case';
import { Head } from '@inertiajs/react';
import { CaseSensitive, Eraser, Link } from 'lucide-react';
import { useMemo, useState } from 'react';

function ResultRow({ label, value }: { label: string; value: string }) {
    return (
        <li className="hover:bg-muted/40 flex items-start gap-3 px-4 py-2">
            <span className="text-muted-foreground w-32 shrink-0 pt-0.5 font-mono text-xs">{label}</span>
            <code className="min-w-0 flex-1 font-mono text-sm break-all whitespace-pre-wrap select-all">
                {value || <span className="text-muted-foreground">–</span>}
            </code>
            <CopyButton value={value} title={`Copy ${label}`} className="-my-1 size-8" />
        </li>
    );
}

export default function CaseConverter() {
    const [input, setInput] = useState('XMLHttpRequest for the user_profile page');
    const [slugOptions, setSlugOptions] = useState<SlugOptions>({ separator: '-', maxLength: 0 });

    const results = useMemo(
        () => CASE_STYLES.map((style) => ({ ...style, value: convertLines(input, (line) => style.convert(splitWords(line))) })),
        [input],
    );
    const slug = useMemo(() => convertLines(input, (line) => slugify(line, slugOptions)), [input, slugOptions]);

    return (
        <AppLayout>
            <Head title="Case Converter" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={CaseSensitive}
                    title="Case converter"
                    highlight="& slugify"
                    description="Convert text to camelCase, snake_case, kebab-case, Title Case and more, or make a URL slug."
                    note={BROWSER_ONLY_NOTE}
                />

                <ToolPanel
                    title={<Label htmlFor="case-input">Text</Label>}
                    actions={
                        <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input}>
                            <Eraser className="h-4 w-4" />
                            Clear
                        </Button>
                    }
                    footer="Each line is converted separately."
                >
                    <Textarea
                        id="case-input"
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type or paste text, one item per line"
                        spellCheck={false}
                        className="min-h-28 resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </ToolPanel>

                <ToolPanel
                    title={
                        <span className="flex items-center gap-2">
                            <Link className="h-4 w-4" /> Slug
                        </span>
                    }
                >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Separator</Label>
                            <Segmented
                                value={slugOptions.separator}
                                onChange={(separator) => setSlugOptions((current) => ({ ...current, separator }))}
                                options={[
                                    { value: '-', label: 'Hyphen -' },
                                    { value: '_', label: 'Underscore _' },
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="slug-max" className="text-sm">
                                Max length
                            </Label>
                            <Input
                                id="slug-max"
                                type="number"
                                min={0}
                                value={slugOptions.maxLength || ''}
                                placeholder="None"
                                onChange={(e) =>
                                    setSlugOptions((current) => ({ ...current, maxLength: Math.max(0, Math.floor(Number(e.target.value)) || 0) }))
                                }
                                className="w-24"
                            />
                        </div>
                    </div>
                    <ul>
                        <ResultRow label="slug" value={slug} />
                    </ul>
                </ToolPanel>

                <ToolPanel title="Cases">
                    <ul className="divide-y">
                        {results.map((result) => (
                            <ResultRow key={result.id} label={result.label} value={result.value} />
                        ))}
                    </ul>
                </ToolPanel>
            </div>
        </AppLayout>
    );
}
