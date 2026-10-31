import { cn } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { type ReactNode } from 'react';

interface ToolPanelProps {
    title: ReactNode;
    actions?: ReactNode;
    footer?: ReactNode;
    className?: string;
    children: ReactNode;
}

/**
 * Card with a title bar, used for the input / output panes of each tool.
 */
export function ToolPanel({ title, actions, footer, className, children }: ToolPanelProps) {
    return (
        <div className={cn('bg-card flex min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm', className)}>
            <div className="flex min-h-11 items-center justify-between gap-2 border-b px-4 py-1.5">
                <div className="text-sm font-semibold">{title}</div>
                {actions && <div className="flex items-center gap-1">{actions}</div>}
            </div>
            {children}
            {footer && <div className="text-muted-foreground border-t px-4 py-2 text-xs tabular-nums">{footer}</div>}
        </div>
    );
}

export function PanelError({ children }: { children: ReactNode }) {
    return (
        <div className="text-destructive flex min-h-64 flex-1 items-start gap-2 p-4 text-sm">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 break-words">{children}</div>
        </div>
    );
}

export const editorClass = 'min-h-64 flex-1 resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0';
