/**
 * UUID v7 (RFC 9562) and ULID generators. Both are monotonic: IDs created in the same millisecond still sort in creation order.
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(length));
}

/* ---------- UUID v7 ---------- */

let uuidLastMs = 0;
let uuidCounter = 0;

/**
 * Uses the 12-bit rand_a field as a counter within a millisecond (RFC 9562, method 1).
 */
export function uuidv7(): string {
    let ms = Date.now();

    if (ms <= uuidLastMs) {
        ms = uuidLastMs;
        uuidCounter++;
        if (uuidCounter > 0xfff) {
            ms = ++uuidLastMs;
            uuidCounter = randomBytes(1)[0] & 0x7f;
        }
    } else {
        uuidLastMs = ms;
        // Start low so plenty of increments remain in this millisecond.
        uuidCounter = randomBytes(1)[0] & 0x7f;
    }

    const bytes = randomBytes(16);
    for (let i = 5; i >= 0; i--) {
        bytes[i] = ms % 256;
        ms = Math.floor(ms / 256);
    }
    bytes[6] = 0x70 | ((uuidCounter >> 8) & 0x0f);
    bytes[7] = uuidCounter & 0xff;
    bytes[8] = 0x80 | (bytes[8] & 0x3f);

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ---------- ULID ---------- */

let ulidLastMs = 0;
let ulidLastRandom = new Uint8Array(10);

function encodeTime(ms: number): string {
    let out = '';
    for (let i = 0; i < 10; i++) {
        out = CROCKFORD[ms % 32] + out;
        ms = Math.floor(ms / 32);
    }
    return out;
}

function encodeRandom(bytes: Uint8Array): string {
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    let out = '';
    for (let i = 0; i < 16; i++) {
        out = CROCKFORD[Number(value & 31n)] + out;
        value >>= 5n;
    }
    return out;
}

/**
 * Within the same millisecond the 80-bit random part is incremented by one, per the ULID spec.
 */
export function ulid(): string {
    let ms = Date.now();

    if (ms <= ulidLastMs) {
        ms = ulidLastMs;
        const next = ulidLastRandom.slice();
        let i = next.length - 1;
        while (i >= 0 && next[i] === 0xff) next[i--] = 0;
        if (i < 0) {
            ms = ++ulidLastMs;
            ulidLastRandom = randomBytes(10);
        } else {
            next[i]++;
            ulidLastRandom = next;
        }
    } else {
        ulidLastMs = ms;
        ulidLastRandom = randomBytes(10);
    }

    return encodeTime(ms) + encodeRandom(ulidLastRandom);
}

/* ---------- Inspection ---------- */

export interface IdInfo {
    type: 'UUID' | 'ULID';
    version?: number;
    timestamp: Date | null;
}

export function inspectId(input: string): IdInfo {
    const value = input.trim();
    const uuid = value.match(/^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/i);

    if (uuid) {
        const hex = uuid.slice(1).join('');
        const version = parseInt(hex[12], 16);
        const timestamp = version === 7 ? new Date(parseInt(hex.slice(0, 12), 16)) : null;
        return { type: 'UUID', version, timestamp };
    }

    if (/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value)) {
        let ms = 0;
        for (const ch of value.slice(0, 10).toUpperCase()) ms = ms * 32 + CROCKFORD.indexOf(ch);
        return { type: 'ULID', timestamp: new Date(ms) };
    }

    throw new Error('Not a valid UUID or ULID.');
}
