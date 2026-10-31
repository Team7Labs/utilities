/**
 * Renders QR codes as SVG markup or PNG files. The `qrcode` package only does the encoding.
 */

import QRCode from 'qrcode';

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
    errorCorrection: ErrorCorrection;
    /** Quiet zone in modules. The spec asks for 4. */
    margin: number;
    foreground: string;
    background: string;
}

export const DEFAULT_QR_OPTIONS: QrOptions = { errorCorrection: 'M', margin: 4, foreground: '#000000', background: '#ffffff' };

export interface QrMatrix {
    size: number;
    isDark: (row: number, col: number) => boolean;
}

export function encodeQr(text: string, errorCorrection: ErrorCorrection): QrMatrix {
    try {
        const { modules } = QRCode.create(text, { errorCorrectionLevel: errorCorrection });
        return { size: modules.size, isDark: (row, col) => modules.get(row, col) === 1 };
    } catch {
        throw new Error('This text is too long for a QR code. Shorten it, or lower the error correction level.');
    }
}

// The SVG is injected as markup, so colors must not be able to break out of their attribute.
const safeColor = (color: string, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback);

export function qrToSvg(matrix: QrMatrix, options: QrOptions): string {
    const { margin } = options;
    const foreground = safeColor(options.foreground, DEFAULT_QR_OPTIONS.foreground);
    const background = safeColor(options.background, DEFAULT_QR_OPTIONS.background);
    const total = matrix.size + margin * 2;
    let path = '';
    for (let row = 0; row < matrix.size; row++) {
        for (let col = 0; col < matrix.size; col++) {
            if (matrix.isDark(row, col)) path += `M${col + margin} ${row + margin}h1v1h-1z`;
        }
    }
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
        `<rect width="${total}" height="${total}" fill="${background}"/>` +
        `<path d="${path}" fill="${foreground}"/></svg>`
    );
}

/** Draws at a whole number of pixels per module so edges stay sharp; the result is close to `size`. */
export function qrToPngBlob(matrix: QrMatrix, { margin, foreground, background }: QrOptions, size: number): Promise<Blob> {
    const total = matrix.size + margin * 2;
    const scale = Math.max(1, Math.round(size / total));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = total * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = foreground;
    for (let row = 0; row < matrix.size; row++) {
        for (let col = 0; col < matrix.size; col++) {
            if (matrix.isDark(row, col)) ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
        }
    }
    return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create PNG.'))), 'image/png'),
    );
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
