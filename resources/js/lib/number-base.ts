/**
 * Arbitrary-precision base conversion and fixed-width bitwise operations, built on BigInt.
 */

export type Base = 2 | 8 | 10 | 16;
export type Width = 8 | 16 | 32 | 64;

export const BASES: { base: Base; label: string; prefix: string }[] = [
    { base: 10, label: 'Decimal', prefix: '' },
    { base: 16, label: 'Hexadecimal', prefix: '0x' },
    { base: 2, label: 'Binary', prefix: '0b' },
    { base: 8, label: 'Octal', prefix: '0o' },
];

const DIGITS: Record<Base, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^\d+$/,
    16: /^[0-9a-f]+$/i,
};

const PREFIXES: Record<string, Base> = { '0x': 16, '0b': 2, '0o': 8 };

/**
 * Parses an integer in `base`. Accepts a leading minus, a matching 0x/0b/0o prefix, and `_`, space or
 * comma separators. With no base given, the prefix decides and decimal is the default.
 */
export function parseInteger(input: string, base?: Base): bigint {
    let text = input.trim().replace(/[\s_,]/g, '');
    const negative = text.startsWith('-');
    if (negative) text = text.slice(1);

    const prefix = PREFIXES[text.slice(0, 2).toLowerCase()];
    if (prefix && (base === undefined || base === prefix)) {
        base = prefix;
        text = text.slice(2);
    }
    base ??= 10;

    if (!DIGITS[base].test(text)) {
        throw new Error(text ? `Not a valid base-${base} number.` : 'Enter a number.');
    }

    const prefixed = base === 10 ? text : `${BASES.find((b) => b.base === base)!.prefix}${text}`;
    const value = BigInt(prefixed);
    return negative ? -value : value;
}

export function formatInteger(value: bigint, base: Base, { uppercase = false } = {}): string {
    const negative = value < 0n;
    const digits = (negative ? -value : value).toString(base);
    return (negative ? '-' : '') + (uppercase ? digits.toUpperCase() : digits);
}

/** Groups digits from the right, e.g. binary in nibbles or decimal in thousands. */
export function groupDigits(digits: string, size: number, separator = ' '): string {
    const negative = digits.startsWith('-');
    const body = negative ? digits.slice(1) : digits;
    const groups: string[] = [];
    for (let end = body.length; end > 0; end -= size) groups.unshift(body.slice(Math.max(0, end - size), end));
    return (negative ? '-' : '') + groups.join(separator);
}

export function bitLength(value: bigint): number {
    return value === 0n ? 1 : (value < 0n ? -value : value).toString(2).length;
}

/* ---------- Bitwise ---------- */

export type Operation = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr';

export const OPERATIONS: { value: Operation; label: string; symbol: string; unary?: boolean }[] = [
    { value: 'and', label: 'AND', symbol: '&' },
    { value: 'or', label: 'OR', symbol: '|' },
    { value: 'xor', label: 'XOR', symbol: '^' },
    { value: 'not', label: 'NOT', symbol: '~', unary: true },
    { value: 'shl', label: '<<', symbol: '<<' },
    { value: 'shr', label: '>>', symbol: '>>>' },
];

/**
 * Applies `operation` to `a` and `b` as `width`-bit unsigned values. Negative inputs are taken as two's
 * complement, and `>>` is a logical shift.
 */
export function bitwise(operation: Operation, a: bigint, b: bigint, width: Width): bigint {
    const ua = BigInt.asUintN(width, a);
    const ub = BigInt.asUintN(width, b);

    switch (operation) {
        case 'and':
            return ua & ub;
        case 'or':
            return ua | ub;
        case 'xor':
            return ua ^ ub;
        case 'not':
            return BigInt.asUintN(width, ~ua);
        case 'shl':
        case 'shr': {
            if (b < 0n) throw new Error('Shift amount can’t be negative.');
            if (b >= BigInt(width)) return 0n;
            return operation === 'shl' ? BigInt.asUintN(width, ua << b) : ua >> b;
        }
    }
}

/** Zero-padded binary at `width` bits, grouped in nibbles. */
export function toBits(value: bigint, width: Width): string {
    return groupDigits(BigInt.asUintN(width, value).toString(2).padStart(width, '0'), 4);
}
