/**
 * Splits text into words (across spaces, punctuation and camelCase boundaries) and rejoins them in
 * common naming conventions.
 */

/**
 * `XMLHttpRequest2_fooBar` → `XML`, `Http`, `Request`, `2`, `foo`, `Bar`. Apostrophes are dropped so
 * `don't` stays one word.
 */
export function splitWords(text: string): string[] {
    return text.replace(/['’]/g, '').match(/\p{Lu}+(?!\p{Ll})|\p{Lu}?\p{Ll}+|\p{N}+|\p{L}+/gu) ?? [];
}

const lower = (word: string) => word.toLowerCase();
const upper = (word: string) => word.toUpperCase();
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// Short words that stay lowercase in Title Case unless they start or end it.
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'up', 'vs', 'via']);

function titleCase(words: string[]): string {
    return words.map((word, i) => (i > 0 && i < words.length - 1 && SMALL_WORDS.has(lower(word)) ? lower(word) : capitalize(word))).join(' ');
}

function stripAccents(text: string): string {
    return text.normalize('NFKD').replace(/\p{M}/gu, '');
}

export interface CaseStyle {
    id: string;
    label: string;
    convert: (words: string[]) => string;
}

export const CASE_STYLES: CaseStyle[] = [
    { id: 'camel', label: 'camelCase', convert: (w) => w.map((word, i) => (i ? capitalize(word) : lower(word))).join('') },
    { id: 'pascal', label: 'PascalCase', convert: (w) => w.map(capitalize).join('') },
    { id: 'snake', label: 'snake_case', convert: (w) => w.map(lower).join('_') },
    { id: 'constant', label: 'CONSTANT_CASE', convert: (w) => w.map(upper).join('_') },
    { id: 'kebab', label: 'kebab-case', convert: (w) => w.map(lower).join('-') },
    { id: 'train', label: 'Train-Case', convert: (w) => w.map(capitalize).join('-') },
    { id: 'dot', label: 'dot.case', convert: (w) => w.map(lower).join('.') },
    { id: 'path', label: 'path/case', convert: (w) => w.map(lower).join('/') },
    { id: 'title', label: 'Title Case', convert: titleCase },
    { id: 'sentence', label: 'Sentence case', convert: (w) => w.map((word, i) => (i ? lower(word) : capitalize(word))).join(' ') },
    { id: 'lower', label: 'lower case', convert: (w) => w.map(lower).join(' ') },
    { id: 'upper', label: 'UPPER CASE', convert: (w) => w.map(upper).join(' ') },
];

export interface SlugOptions {
    separator: '-' | '_';
    /** 0 means no limit. Cuts at a word boundary where possible. */
    maxLength: number;
}

/** URL-safe ASCII slug: `Crème Brûlée à la mode!` → `creme-brulee-a-la-mode`. */
export function slugify(text: string, { separator, maxLength }: SlugOptions): string {
    const words = splitWords(stripAccents(text).replace(/&/g, ' and '))
        .map(lower)
        .map((word) => word.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean);

    let slug = words.join(separator);
    if (maxLength > 0 && slug.length > maxLength) {
        const cut = slug.slice(0, maxLength + 1);
        const boundary = cut.lastIndexOf(separator);
        slug = boundary > 0 ? cut.slice(0, boundary) : slug.slice(0, maxLength);
    }
    return slug;
}

/** Applies `convert` to each line separately so lists of names keep their shape. */
export function convertLines(text: string, convert: (line: string) => string): string {
    return text
        .split('\n')
        .map((line) => convert(line))
        .join('\n');
}
