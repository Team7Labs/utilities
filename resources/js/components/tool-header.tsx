import { useI18n } from '@/lib/i18n';
import { Lock, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface ToolHeaderProps {
    icon: LucideIcon;
    title: string;
    highlight: string;
    description: string;
    note?: ReactNode;
}

export function ToolHeader({ icon: Icon, title, highlight, description, note }: ToolHeaderProps) {
    return (
        <section className="space-y-3 text-center">
            <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-2xl shadow-sm">
                <Icon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {title} <span className="text-primary">{highlight}</span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-md">{description}</p>
            {note && (
                <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <Lock className="h-3.5 w-3.5" /> {note}
                </p>
            )}
        </section>
    );
}

function BrowserOnlyNote() {
    return useI18n().t.browserOnlyNote;
}

export const BROWSER_ONLY_NOTE = <BrowserOnlyNote />;
