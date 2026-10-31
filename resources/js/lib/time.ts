/**
 * Timestamp parsing and time-zone-aware formatting, using only Intl (no tz database bundled).
 */

export type Unit = 'auto' | 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

export interface ParsedTime {
    ms: number;
    /** How the input was read, e.g. "Unix seconds" or "ISO 8601 date". */
    detected: string;
}

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function listTimeZones(): string[] {
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return zones.includes('UTC') ? zones : ['UTC', ...zones];
}

export function isValidTimeZone(zone: string): boolean {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: zone });
        return true;
    } catch {
        return false;
    }
}

interface WallTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar date and clock time at instant `ms`, as seen in `zone`. */
export function wallTime(ms: number, zone: string): WallTime {
    let formatter = partsFormatters.get(zone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        });
        partsFormatters.set(zone, formatter);
    }
    const parts = Object.fromEntries(formatter.formatToParts(ms).map((part) => [part.type, part.value]));
    // Years before 1 AD come back as a positive year with era "BC".
    const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year);
    return {
        year,
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        millisecond: ((ms % 1000) + 1000) % 1000,
    };
}

function wallToUtcMs(wall: WallTime): number {
    const date = new Date(0);
    date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
    date.setUTCHours(wall.hour, wall.minute, wall.second, wall.millisecond);
    return date.getTime();
}

/** UTC offset of `zone` at instant `ms`, in minutes east of UTC. */
export function offsetMinutes(ms: number, zone: string): number {
    return Math.round((wallToUtcMs(wallTime(ms, zone)) - ms) / 60000);
}

/**
 * The instant at which the clock in `zone` reads `wall`. When the clock falls back and a time happens
 * twice, the earlier one wins; when it springs forward past a time, it is moved forward (like Temporal).
 */
function zonedWallToMs(wall: WallTime, zone: string): number {
    const guess = wallToUtcMs(wall);
    const first = guess - offsetMinutes(guess, zone) * 60000;
    const second = guess - offsetMinutes(first, zone) * 60000;
    const candidates = [first, second].sort((a, b) => a - b);
    const matching = candidates.filter((ms) => wallToUtcMs(wallTime(ms, zone)) === guess);
    return matching.length ? matching[0] : candidates[candidates.length - 1];
}

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, '0');

export function formatOffset(minutes: number): string {
    const sign = minutes < 0 ? '-' : '+';
    return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

/** ISO 8601 with the zone's offset, e.g. `2026-10-31T14:30:00.000+06:30`. UTC uses `Z`. */
export function toZonedIso(ms: number, zone: string): string {
    const wall = wallTime(ms, zone);
    const offset = offsetMinutes(ms, zone);
    const year = wall.year >= 0 && wall.year <= 9999 ? pad(wall.year, 4) : `${wall.year < 0 ? '-' : '+'}${pad(wall.year, 6)}`;
    const date = `${year}-${pad(wall.month)}-${pad(wall.day)}`;
    const time = `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}.${pad(wall.millisecond, 3)}`;
    return `${date}T${time}${offset === 0 && zone === 'UTC' ? 'Z' : formatOffset(offset)}`;
}

/** Value for an `<input type="datetime-local">` showing `ms` in `zone`. */
export function toDatetimeLocal(ms: number, zone: string): string {
    return toZonedIso(ms, zone).slice(0, 19);
}

// 2026-10-31, 2026-10-31T14:30, 2026-10-31 14:30:05.123: no offset, so it's a wall time in the chosen zone.
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/;

const UNIT_FACTORS: Record<Exclude<Unit, 'auto'>, number> = {
    seconds: 1000,
    milliseconds: 1,
    microseconds: 1 / 1000,
    nanoseconds: 1 / 1e6,
};

const UNIT_LABELS: Record<Exclude<Unit, 'auto'>, string> = {
    seconds: 'Unix seconds',
    milliseconds: 'Unix milliseconds',
    microseconds: 'Unix microseconds',
    nanoseconds: 'Unix nanoseconds',
};

/** Guesses the unit from the number of integer digits, which works for dates between 1973 and 5138. */
function guessUnit(integerDigits: number): Exclude<Unit, 'auto'> {
    if (integerDigits <= 11) return 'seconds';
    if (integerDigits <= 14) return 'milliseconds';
    if (integerDigits <= 17) return 'microseconds';
    return 'nanoseconds';
}

/**
 * Reads a Unix timestamp, an ISO 8601 string, or anything `Date` understands. Date-times without an
 * offset are taken as wall-clock time in `zone`.
 */
export function parseTime(input: string, unit: Unit, zone: string): ParsedTime {
    const text = input.trim();
    if (!text) throw new Error('Enter a timestamp or date.');

    // Digit separators are allowed in numbers: 1_700_000_000 or 1,700,000,000.
    const number = text.replace(/[_,\s]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(number)) {
        const resolved = unit === 'auto' ? guessUnit(number.replace(/^-/, '').split('.')[0].length) : unit;
        const ms = Number(number) * UNIT_FACTORS[resolved];
        if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new Error('That timestamp is out of range.');
        return { ms: Math.floor(ms), detected: UNIT_LABELS[resolved] + (unit === 'auto' ? ' (detected)' : '') };
    }

    const local = text.match(LOCAL_DATE_TIME);
    if (local) {
        const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '0'] = local;
        const wall = {
            year: Number(year),
            month: Number(month),
            day: Number(day),
            hour: Number(hour),
            minute: Number(minute),
            second: Number(second),
            millisecond: Number(fraction.padEnd(3, '0')),
        };
        const daysInMonth = new Date(Date.UTC(wall.year, wall.month, 0)).getUTCDate();
        if (wall.month < 1 || wall.month > 12 || wall.day < 1 || wall.day > daysInMonth || wall.hour > 23 || wall.minute > 59 || wall.second > 59) {
            throw new Error('That date or time doesn’t exist.');
        }
        return { ms: zonedWallToMs(wall, zone), detected: `Date and time in ${zone}` };
    }

    const ms = Date.parse(text);
    if (Number.isNaN(ms)) throw new Error('Not a timestamp or a date format I recognise. Try ISO 8601, like 2026-10-31T14:30:00Z.');
    return { ms, detected: /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/i.test(text) ? 'ISO 8601 with offset' : 'Date string' };
}

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];

export function relativeTime(ms: number, now: number): string {
    const seconds = Math.round((ms - now) / 1000);
    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size || unit === 'second') return relativeFormat.format(Math.trunc(seconds / size), unit);
    }
    return '';
}

export function formatLong(ms: number, zone: string): string {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, dateStyle: 'full', timeStyle: 'long' }).format(ms);
}

/** ISO week number and day of the year, using the calendar date in `zone`. */
export function calendarInfo(ms: number, zone: string): { dayOfYear: number; isoWeek: number } {
    const { year, month, day } = wallTime(ms, zone);
    const date = Date.UTC(year, month - 1, day);
    const dayOfYear = Math.round((date - Date.UTC(year, 0, 1)) / 86400000) + 1;
    // ISO weeks start on Monday; week 1 contains the year's first Thursday.
    const weekday = (new Date(date).getUTCDay() + 6) % 7;
    const thursday = date + (3 - weekday) * 86400000;
    const isoWeek = Math.floor((thursday - Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1)) / (7 * 86400000)) + 1;
    return { dayOfYear, isoWeek };
}
