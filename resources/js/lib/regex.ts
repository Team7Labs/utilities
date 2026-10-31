/**
 * Regex matching for the tester. Runs inside a Web Worker (see regex.worker.ts) so that a pattern with
 * catastrophic backtracking can be stopped instead of freezing the page.
 */

export const MAX_MATCHES = 1000;

export interface RegexRequest {
    id: number;
    pattern: string;
    flags: string;
    text: string;
    replacement: string;
}

export interface MatchGroup {
    /** 1-based group number. */
    index: number;
    name?: string;
    value?: string;
    start?: number;
    end?: number;
}

export interface RegexMatch {
    start: number;
    end: number;
    value: string;
    groups: MatchGroup[];
}

export type RegexResponse =
    { id: number; ok: true; matches: RegexMatch[]; truncated: boolean; replaced: string; source: string } | { id: number; ok: false; error: string };

/**
 * Names of capturing groups by group number. `match.groups` only maps names to values, so this walks the
 * pattern, skipping escapes and character classes, and numbers each `(` that captures.
 */
export function groupNames(pattern: string): (string | undefined)[] {
    const names: (string | undefined)[] = [undefined];
    let inClass = false;
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (ch === '\\') i++;
        else if (inClass) inClass = ch !== ']';
        else if (ch === '[') inClass = true;
        else if (ch === '(') {
            const named = pattern.slice(i).match(/^\(\?<([A-Za-z_$][\w$]*)>/);
            if (named) names.push(named[1]);
            else if (pattern[i + 1] !== '?') names.push(undefined);
        }
    }
    return names;
}

export function runRegex({ id, pattern, flags, text, replacement }: RegexRequest): RegexResponse {
    let regex: RegExp;
    try {
        // `d` records group offsets; it doesn't change what matches.
        regex = new RegExp(pattern, flags.includes('d') ? flags : flags + 'd');
    } catch (e) {
        return { id, ok: false, error: (e as Error).message.replace(/^Invalid regular expression: (\/.*\/[a-z]*: )?/s, '') };
    }

    const names = groupNames(pattern);
    const matches: RegexMatch[] = [];
    let truncated = false;

    // Without `g`, only the first match counts, same as replace().
    const found = regex.global ? text.matchAll(regex) : [regex.exec(text)];
    for (const match of found) {
        if (!match) break;
        if (matches.length === MAX_MATCHES) {
            truncated = true;
            break;
        }
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
            value: match[0],
            groups: match.slice(1).map((value, i) => ({
                index: i + 1,
                name: names[i + 1],
                value,
                start: match.indices?.[i + 1]?.[0],
                end: match.indices?.[i + 1]?.[1],
            })),
        });
    }

    regex.lastIndex = 0;
    return { id, ok: true, matches, truncated, replaced: text.replace(regex, replacement), source: regex.source };
}
