import { Button } from '@/components/ui/button';
import { DEFAULT_QR_OPTIONS, downloadBlob, encodeQr, type QrOptions, qrToPngBlob, qrToSvg } from '@/lib/qr';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { useMemo } from 'react';

interface QrCodeProps {
    value: string;
    options?: QrOptions;
    /** PNG download size in pixels. */
    pngSize?: number;
    filename?: string;
    className?: string;
}

/**
 * A QR code preview with PNG and SVG download buttons. Renders nothing for empty or over-long values.
 */
export function QrCode({ value, options = DEFAULT_QR_OPTIONS, pngSize = 1024, filename = 'qr-code', className }: QrCodeProps) {
    const matrix = useMemo(() => {
        try {
            return value ? encodeQr(value, options.errorCorrection) : null;
        } catch {
            return null;
        }
    }, [value, options.errorCorrection]);
    const svg = useMemo(() => (matrix ? qrToSvg(matrix, options) : ''), [matrix, options]);

    if (!matrix) return null;

    return (
        <div className={cn('flex flex-col items-center gap-4', className)}>
            <div
                className="aspect-square w-full max-w-64 overflow-hidden rounded-xl border shadow-sm [&>svg]:h-full [&>svg]:w-full"
                role="img"
                aria-label={`QR code for ${value}`}
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="flex gap-2">
                <Button type="button" onClick={async () => downloadBlob(await qrToPngBlob(matrix, options, pngSize), `${filename}.png`)}>
                    <Download className="h-4 w-4" />
                    PNG
                </Button>
                <Button type="button" variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${filename}.svg`)}>
                    <Download className="h-4 w-4" />
                    SVG
                </Button>
            </div>
        </div>
    );
}
