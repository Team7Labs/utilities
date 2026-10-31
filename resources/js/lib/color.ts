/**
 * Color parsing and conversion between sRGB (hex, rgb, hsl) and OKLCH, plus WCAG 2 contrast ratios.
 * Colors are held as sRGB channels in 0–1 with an alpha in 0–1.
 */

export interface Rgba {
    r: number;
    g: number;
    b: number;
    alpha: number;
    /** Set when the input was outside the sRGB gamut and had to be clipped. */
    clipped?: boolean;
}

export interface Oklch {
    l: number;
    c: number;
    h: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const round = (value: number, digits = 0) => {
    const factor = 10 ** digits;
    // `+ 0` turns -0 into 0.
    return Math.round(value * factor) / factor + 0;
};

/* ---------- Parsing ---------- */

function parseHex(input: string): Rgba | null {
    const match = input.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!match) return null;
    let hex = match[1];
    if (hex.length <= 4) hex = [...hex].map((ch) => ch + ch).join('');
    const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    return { r: channel(0), g: channel(2), b: channel(4), alpha: hex.length === 8 ? channel(6) : 1 };
}

/** Splits `fn(a b c / d)` or `fn(a, b, c, d)` into its arguments. */
function parseFunction(input: string, names: string[]): string[] | null {
    const match = input.match(/^([a-z]+)\(\s*(.*?)\s*\)$/i);
    if (!match || !names.includes(match[1].toLowerCase())) return null;
    const parts = match[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);
    return parts.length === 3 || parts.length === 4 ? parts : null;
}

/** Parses a number, or a percentage scaled so that 100% equals `percentScale`. */
function parseNumber(value: string, percentScale: number): number {
    const percent = value.endsWith('%');
    const number = Number(percent ? value.slice(0, -1) : value);
    if (value === '' || Number.isNaN(number)) throw new Error(`“${value}” is not a number.`);
    return percent ? (number / 100) * percentScale : number;
}

function parseHue(value: string): number {
    const match = value.match(/^(-?[\d.]+)(deg|turn|rad)?$/i);
    if (!match) throw new Error(`“${value}” is not a hue.`);
    const number = Number(match[1]);
    const unit = match[2]?.toLowerCase();
    const degrees = unit === 'turn' ? number * 360 : unit === 'rad' ? (number * 180) / Math.PI : number;
    return ((degrees % 360) + 360) % 360;
}

const parseAlpha = (value: string | undefined) => (value === undefined ? 1 : clamp(parseNumber(value, 1)));

function parseRgb(input: string): Rgba | null {
    const parts = parseFunction(input, ['rgb', 'rgba']);
    if (!parts) return null;
    const [r, g, b] = parts.slice(0, 3).map((part) => clamp(parseNumber(part, 255) / 255));
    return { r, g, b, alpha: parseAlpha(parts[3]) };
}

function parseHsl(input: string): Rgba | null {
    const parts = parseFunction(input, ['hsl', 'hsla']);
    if (!parts) return null;
    const h = parseHue(parts[0]);
    const s = clamp(parseNumber(parts[1], 100) / 100);
    const l = clamp(parseNumber(parts[2], 100) / 100);
    return { ...hslToRgb(h, s, l), alpha: parseAlpha(parts[3]) };
}

function parseOklch(input: string): Rgba | null {
    const parts = parseFunction(input, ['oklch']);
    if (!parts) return null;
    const l = clamp(parseNumber(parts[0], 1));
    // In CSS, 100% chroma is 0.4.
    const c = Math.max(parseNumber(parts[1], 0.4), 0);
    const h = parseHue(parts[2]);
    return { ...oklchToRgb({ l, c, h }), alpha: parseAlpha(parts[3]), clipped: !isInSrgbGamut({ l, c, h }) };
}

/** Named colors and anything else the browser understands, normalised through a canvas. */
function parseWithBrowser(input: string): Rgba | null {
    if (typeof document === 'undefined' || !/^[a-z]+$/i.test(input) || !CSS.supports('color', input)) return null;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = input;
    return parseHex(ctx.fillStyle) ?? parseRgb(ctx.fillStyle);
}

/**
 * Parses hex, rgb(), hsl(), oklch() or a CSS color name. Throws with a readable message on bad input.
 */
export function parseColor(input: string): Rgba {
    const value = input.trim();
    const color = parseHex(value) ?? parseRgb(value) ?? parseHsl(value) ?? parseOklch(value) ?? parseWithBrowser(value);
    if (!color) throw new Error('Use hex (#6366f1), rgb(), hsl(), oklch() or a CSS color name.');
    return color;
}

/* ---------- Conversion ---------- */

function hslToRgb(h: number, s: number, l: number): Omit<Rgba, 'alpha'> {
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: f(0), g: f(8), b: f(4) };
}

export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s, l };
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB → OKLab → OKLCH (Björn Ottosson's matrices). */
export function rgbToOklch({ r, g, b }: Rgba): Oklch {
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

    const c = Math.hypot(A, B);
    // Hue is meaningless for greys; report 0 rather than rounding noise.
    const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    return { l: L, c, h };
}

/** Returns sRGB channels, which fall outside 0–1 when the color is out of the sRGB gamut. */
function oklchToLinearRgb({ l: L, c, h }: Oklch): [number, number, number] {
    const A = c * Math.cos((h * Math.PI) / 180);
    const B = c * Math.sin((h * Math.PI) / 180);

    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
}

// Allows for the rounding in printed OKLCH values, so colors like oklch(62.8% 0.2577 29.23) count as in gamut.
const GAMUT_EPSILON = 2e-3;

export function isInSrgbGamut(color: Oklch): boolean {
    return oklchToLinearRgb(color).every((c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON);
}

/** Converts to sRGB, clipping out-of-gamut colors. */
function oklchToRgb(color: Oklch): Omit<Rgba, 'alpha'> {
    const [r, g, b] = oklchToLinearRgb(color).map((c) => clamp(fromLinear(clamp(c))));
    return { r, g, b };
}

/* ---------- Formatting ---------- */

const alphaSuffix = (alpha: number) => (alpha < 1 ? ` / ${round(alpha * 100)}%` : '');

export function toHex({ r, g, b, alpha }: Rgba): string {
    const channels = alpha < 1 ? [r, g, b, alpha] : [r, g, b];
    return (
        '#' +
        channels
            .map((c) =>
                Math.round(clamp(c) * 255)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}

export function toRgbString(color: Rgba): string {
    const [r, g, b] = [color.r, color.g, color.b].map((c) => Math.round(clamp(c) * 255));
    return `rgb(${r} ${g} ${b}${alphaSuffix(color.alpha)})`;
}

export function toHslString(color: Rgba): string {
    const { h, s, l } = rgbToHsl(color);
    return `hsl(${round(h, 1) % 360} ${round(s * 100, 1)}% ${round(l * 100, 1)}%${alphaSuffix(color.alpha)})`;
}

export function toOklchString(color: Rgba): string {
    const { l, c, h } = rgbToOklch(color);
    return `oklch(${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}${alphaSuffix(color.alpha)})`;
}

/* ---------- WCAG contrast ---------- */

/** WCAG 2 relative luminance. */
export function luminance({ r, g, b }: Rgba): number {
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Blends a translucent color over an opaque backdrop. */
export function composite(top: Rgba, backdrop: Rgba): Rgba {
    const mix = (a: number, b: number) => a * top.alpha + b * (1 - top.alpha);
    return { r: mix(top.r, backdrop.r), g: mix(top.g, backdrop.g), b: mix(top.b, backdrop.b), alpha: 1 };
}

const WHITE: Rgba = { r: 1, g: 1, b: 1, alpha: 1 };

/**
 * Contrast ratio from 1 to 21. A translucent background is assumed to sit on white, and a translucent
 * foreground is blended onto the background.
 */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
    const bg = composite(background, WHITE);
    const fg = composite(foreground, bg);
    const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

export const WCAG_THRESHOLDS = [
    { level: 'AA', target: 'Normal text', min: 4.5 },
    { level: 'AA', target: 'Large text', min: 3 },
    { level: 'AA', target: 'UI components', min: 3 },
    { level: 'AAA', target: 'Normal text', min: 7 },
    { level: 'AAA', target: 'Large text', min: 4.5 },
] as const;
