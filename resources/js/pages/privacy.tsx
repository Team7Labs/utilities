import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { useI18n } from '@/lib/i18n';
import { REPO_URL, tools } from '@/lib/tools';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { Ban, Check, Cookie, Github, Hash, Link2, Lock, MonitorSmartphone, Server, ShieldCheck, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

function Section({ icon: Icon, title, className, children }: { icon: LucideIcon; title: string; className?: string; children: ReactNode }) {
    return (
        <section className={cn('bg-card space-y-4 rounded-2xl border p-6 shadow-sm', className)}>
            <h2 className="flex items-center gap-2.5 text-lg font-semibold">
                <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                </span>
                {title}
            </h2>
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
        </section>
    );
}

function Points({ items }: { items: ReactNode[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

const Code = ({ children }: { children: ReactNode }) => <code className="bg-muted text-foreground rounded px-1 font-mono text-xs">{children}</code>;

export default function Privacy() {
    const { t } = useI18n();
    const p = t.privacy;
    const browserOnly = tools.filter((tool) => !tool.usesServer);
    const hashTool = tools.find((tool) => tool.href === '/hash-generator')!;
    const shortenerTool = tools.find((tool) => tool.href === '/url-shortener')!;

    return (
        <AppLayout>
            <Head title={p.pageTitle} />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
                <section className="space-y-4 pb-2 text-center">
                    <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-2xl shadow-sm">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                        {p.title} <span className="text-primary">{p.highlight}</span>
                    </h1>
                    <p className="text-muted-foreground mx-auto max-w-xl">{p.intro}</p>
                    <Button asChild>
                        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4" />
                            {p.checkCode}
                        </a>
                    </Button>
                    <p className="text-muted-foreground text-left text-xs">{p.updated(p.updatedDate)}</p>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section icon={MonitorSmartphone} className="lg:col-span-2" title={p.browserTitle}>
                        <p>{p.browserBody}</p>
                        <div className="flex flex-wrap gap-2">
                            {browserOnly.map((tool) => (
                                <Link
                                    key={tool.href}
                                    href={tool.href}
                                    prefetch
                                    className="bg-background text-foreground hover:border-primary/40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                                >
                                    <tool.icon className="h-3.5 w-3.5" />
                                    {tool.title}
                                </Link>
                            ))}
                        </div>
                    </Section>

                    <Section icon={Server} title={p.serverTitle} className="lg:col-span-2">
                        <p>{p.serverBody}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="bg-background space-y-2 rounded-xl border p-4">
                                <h3 className="text-foreground flex items-center gap-2 font-semibold">
                                    <Hash className="h-4 w-4" /> {hashTool.title}
                                </h3>
                                <Points items={p.hashPoints} />
                            </div>
                            <div className="bg-background space-y-2 rounded-xl border p-4">
                                <h3 className="text-foreground flex items-center gap-2 font-semibold">
                                    <Link2 className="h-4 w-4" /> {shortenerTool.title}
                                </h3>
                                <Points items={p.shortenerPoints} />
                            </div>
                        </div>
                    </Section>

                    <Section icon={Ban} title={p.dontTitle}>
                        <Points items={p.dontPoints} />
                    </Section>

                    <Section icon={Cookie} title={p.technicalTitle}>
                        <p>{p.technicalBody}</p>
                        <Points items={[p.sessionCookie(<Code key="xsrf">XSRF-TOKEN</Code>), p.rateLimit, p.theme]} />
                    </Section>

                    <Section icon={Lock} title={p.trustTitle} className="lg:col-span-2">
                        <p>
                            {p.trustBody(
                                <Code key="controllers">app/Http/Controllers</Code>,
                                <Code key="shortener">app/Services/UrlShortener.php</Code>,
                                <Code key="js">resources/js</Code>,
                            )}
                        </p>
                        <Button variant="outline" asChild>
                            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                                <Github className="h-4 w-4" />
                                github.com/Team7Labs/utilities
                            </a>
                        </Button>
                    </Section>
                </div>
            </div>
        </AppLayout>
    );
}
