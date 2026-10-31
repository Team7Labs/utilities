import AppLayout from '@/layouts/app-layout';
import { useI18n } from '@/lib/i18n';
import { searchTools } from '@/lib/tools';
import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, Plus, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
    const [query, setQuery] = useState('');
    const { t } = useI18n();
    const visible = searchTools(query);

    return (
        <AppLayout>
            <Head title="Home" />
            <div className="relative flex h-full flex-1 flex-col">
                <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 md:px-8 md:py-16">
                    <section className="space-y-4">
                        <span className="bg-background/80 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
                            <Sparkles className="text-primary h-3.5 w-3.5" />
                            {t.home.badge}
                        </span>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                            {t.home.title} <span className="text-primary">{t.home.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground max-w-xl text-base md:text-lg">{t.home.subtitle}</p>
                        <label className="bg-card focus-within:border-primary/50 focus-within:ring-primary/15 flex max-w-md items-center gap-2 rounded-xl border px-3 shadow-sm transition focus-within:ring-4">
                            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                            <span className="sr-only">{t.header.searchLabel}</span>
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t.header.searchTools}
                                className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-sm outline-none"
                            />
                        </label>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visible.map((utility) => (
                            <Link
                                key={utility.href}
                                href={utility.href}
                                prefetch
                                className="group bg-card hover:border-primary/40 hover:shadow-primary/10 focus-visible:ring-ring relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-sm">
                                        <utility.icon className="h-5 w-5" />
                                    </div>
                                    <ArrowUpRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </div>
                                <div className="space-y-1.5">
                                    <h2 className="font-semibold">{utility.title}</h2>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{utility.description}</p>
                                </div>
                            </Link>
                        ))}

                        <div className="text-muted-foreground flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center text-sm">
                            <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
                                <Plus className="h-5 w-5" />
                            </div>
                            {visible.length === 0 ? t.header.noMatch(query) : t.home.moreSoon}
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
