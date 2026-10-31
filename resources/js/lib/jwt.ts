import { base64ToBytes, base64ToText } from '@/lib/base64';

export interface DecodedJwt {
    header: Record<string, unknown>;
    payload: Record<string, unknown> | string;
    parts: [string, string, string];
}

export function decodeJwt(token: string): DecodedJwt {
    const parts = token.trim().split('.');
    if (parts.length === 5) throw new Error('This looks like an encrypted JWE (5 parts). Only signed JWTs (3 parts) can be decoded.');
    if (parts.length !== 3) throw new Error(`A JWT has 3 parts separated by dots; this has ${parts.length}.`);

    let header: unknown;
    try {
        header = JSON.parse(base64ToText(parts[0]));
    } catch {
        throw new Error('The header is not valid Base64url-encoded JSON.');
    }
    if (!header || typeof header !== 'object' || Array.isArray(header)) throw new Error('The header must be a JSON object.');

    let payload: Record<string, unknown> | string;
    try {
        const text = base64ToText(parts[1]);
        try {
            payload = JSON.parse(text);
        } catch {
            payload = text;
        }
    } catch {
        throw new Error('The payload is not valid Base64url.');
    }

    return { header: header as Record<string, unknown>, payload, parts: parts as [string, string, string] };
}

type Algorithm = { kind: 'hmac' | 'rsa' | 'pss' | 'ecdsa'; hash: string; curve?: string };

const ALGORITHMS: Record<string, Algorithm> = {
    HS256: { kind: 'hmac', hash: 'SHA-256' },
    HS384: { kind: 'hmac', hash: 'SHA-384' },
    HS512: { kind: 'hmac', hash: 'SHA-512' },
    RS256: { kind: 'rsa', hash: 'SHA-256' },
    RS384: { kind: 'rsa', hash: 'SHA-384' },
    RS512: { kind: 'rsa', hash: 'SHA-512' },
    PS256: { kind: 'pss', hash: 'SHA-256' },
    PS384: { kind: 'pss', hash: 'SHA-384' },
    PS512: { kind: 'pss', hash: 'SHA-512' },
    ES256: { kind: 'ecdsa', hash: 'SHA-256', curve: 'P-256' },
    ES384: { kind: 'ecdsa', hash: 'SHA-384', curve: 'P-384' },
    ES512: { kind: 'ecdsa', hash: 'SHA-512', curve: 'P-521' },
};

export function verificationKind(alg: unknown): 'secret' | 'public-key' | null {
    const algorithm = typeof alg === 'string' ? ALGORITHMS[alg] : undefined;
    if (!algorithm) return null;
    return algorithm.kind === 'hmac' ? 'secret' : 'public-key';
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
    const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, '').replace(/\s+/g, '');
    if (!body) throw new Error('Paste a PEM public key (-----BEGIN PUBLIC KEY-----).');
    return base64ToBytes(body);
}

/**
 * Verifies the signature with Web Crypto. `key` is the shared secret for HS*, or a PEM public key otherwise.
 */
export async function verifyJwt(jwt: DecodedJwt, key: string, secretIsBase64: boolean): Promise<boolean> {
    if (!crypto.subtle) throw new Error('Signature verification needs a secure context (HTTPS or localhost).');

    const algorithm = ALGORITHMS[String(jwt.header.alg)];
    if (!algorithm) throw new Error(`Verifying "${String(jwt.header.alg)}" signatures is not supported.`);

    const data = new TextEncoder().encode(`${jwt.parts[0]}.${jwt.parts[1]}`);
    const signature = base64ToBytes(jwt.parts[2]);

    if (algorithm.kind === 'hmac') {
        const secret = secretIsBase64 ? base64ToBytes(key) : new TextEncoder().encode(key);
        const cryptoKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: algorithm.hash }, false, ['verify']);
        return crypto.subtle.verify('HMAC', cryptoKey, signature, data);
    }

    const der = pemToDer(key);
    const importParams =
        algorithm.kind === 'ecdsa'
            ? { name: 'ECDSA', namedCurve: algorithm.curve! }
            : { name: algorithm.kind === 'rsa' ? 'RSASSA-PKCS1-v1_5' : 'RSA-PSS', hash: algorithm.hash };

    let cryptoKey: CryptoKey;
    try {
        cryptoKey = await crypto.subtle.importKey('spki', der, importParams, false, ['verify']);
    } catch {
        throw new Error('Could not read that public key. Use a PEM "PUBLIC KEY" (SPKI) that matches the algorithm.');
    }

    const verifyParams =
        algorithm.kind === 'ecdsa'
            ? { name: 'ECDSA', hash: algorithm.hash }
            : algorithm.kind === 'pss'
              ? { name: 'RSA-PSS', saltLength: Number(algorithm.hash.slice(4)) / 8 }
              : { name: 'RSASSA-PKCS1-v1_5' };

    return crypto.subtle.verify(verifyParams, cryptoKey, signature, data);
}
