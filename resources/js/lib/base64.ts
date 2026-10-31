/**
 * Base64 helpers that work on bytes, so Unicode text and binary files round-trip correctly.
 */

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const encoded = btoa(binary);
    return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : encoded;
}

/**
 * Accepts standard or URL-safe Base64, with or without padding and whitespace.
 */
export function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
    const cleaned = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) || cleaned.replace(/=+$/, '').length % 4 === 1) {
        throw new Error('This is not valid Base64.');
    }
    const binary = atob(cleaned.replace(/=+$/, '').padEnd(Math.ceil(cleaned.replace(/=+$/, '').length / 4) * 4, '='));
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

export function textToBase64(text: string, urlSafe = false): string {
    return bytesToBase64(new TextEncoder().encode(text), urlSafe);
}

export function base64ToText(input: string): string {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(input));
    } catch (e) {
        if (e instanceof TypeError) throw new Error('The decoded data is not valid UTF-8 text. It may be a binary file.');
        throw e;
    }
}

export function formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

const SIGNATURES: { mime: string; ext: string; bytes: number[]; offset?: number }[] = [
    { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
    { mime: 'image/gif', ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
    { mime: 'image/webp', ext: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
    { mime: 'application/pdf', ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
    { mime: 'application/zip', ext: 'zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
    { mime: 'application/gzip', ext: 'gz', bytes: [0x1f, 0x8b] },
    { mime: 'audio/mpeg', ext: 'mp3', bytes: [0x49, 0x44, 0x33] },
    { mime: 'image/x-icon', ext: 'ico', bytes: [0x00, 0x00, 0x01, 0x00] },
];

/** Guesses a file type from its first bytes. */
export function sniffType(bytes: Uint8Array): { mime: string; ext: string } {
    for (const signature of SIGNATURES) {
        const offset = signature.offset ?? 0;
        if (signature.bytes.every((byte, i) => bytes[offset + i] === byte)) return { mime: signature.mime, ext: signature.ext };
    }
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, 512));
        if (text.trimStart().startsWith('<svg') || text.includes('<svg')) return { mime: 'image/svg+xml', ext: 'svg' };
        return { mime: 'text/plain', ext: 'txt' };
    } catch {
        return { mime: 'application/octet-stream', ext: 'bin' };
    }
}
