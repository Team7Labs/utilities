import { Button, type ButtonProps } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'value'> {
    value: string;
    label?: string;
}

/**
 * Copies `value` to the clipboard. Renders icon-only unless a `label` is given.
 */
export function CopyButton({ value, label, variant = 'ghost', size, title = 'Copy', ...props }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Button type="button" variant={variant} size={size ?? (label ? 'sm' : 'icon')} onClick={copy} disabled={!value} title={title} {...props}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {label && (copied ? 'Copied' : label)}
        </Button>
    );
}
