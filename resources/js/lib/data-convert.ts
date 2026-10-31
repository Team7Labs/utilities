/**
 * Converts data between JSON, YAML and CSV, and infers TypeScript types from sample JSON.
 */

import YAML from 'yaml';

export type Format = 'json' | 'yaml' | 'csv' | 'typescript';
export type Delimiter = ',' | ';' | '\t';

export interface ConvertOptions {
    delimiter: Delimiter;
    /** CSV → data: turn "42", "true" and "null" cells into numbers, booleans and null. */
    inferTypes: boolean;
    rootName: string;
}

export function parseInput(input: string, format: Exclude<Format, 'typescript'>, options: ConvertOptions): unknown {
    switch (format) {
        case 'json':
            return JSON.parse(input);
        case 'yaml':
            return YAML.parse(input);
        case 'csv':
            return csvToObjects(input, options.delimiter, options.inferTypes);
    }
}

export function formatOutput(data: unknown, format: Format, options: ConvertOptions): string {
    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);
        case 'yaml':
            return YAML.stringify(data, { lineWidth: 0 });
        case 'csv':
            return objectsToCsv(data, options.delimiter);
        case 'typescript':
            return jsonToTypeScript(data, options.rootName);
    }
}

/* ---------- CSV ---------- */

/** RFC 4180 parser: quoted fields may contain delimiters, newlines and doubled quotes. */
export function parseCsv(input: string, delimiter: Delimiter): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (quoted) {
            if (ch === '"' && input[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                quoted = false;
            } else {
                field += ch;
            }
        } else if (ch === '"' && field === '') {
            quoted = true;
        } else if (ch === delimiter) {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && input[i + 1] === '\n') i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }
    if (quoted) throw new Error('A quoted field is never closed.');
    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }
    // Ignore blank lines, which commonly trail a file.
    return rows.filter((r) => r.length > 1 || r[0] !== '');
}

function inferCell(cell: string): unknown {
    if (cell === 'true') return true;
    if (cell === 'false') return false;
    if (cell === 'null' || cell === '') return null;
    // Arrays and objects are written to CSV as JSON, so read them back the same way.
    if (/^[[{]/.test(cell)) {
        try {
            return JSON.parse(cell);
        } catch {
            return cell;
        }
    }
    // Leave values like "007" or "1e999" alone; they are probably identifiers, not numbers.
    if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(cell) && Number.isFinite(Number(cell))) return Number(cell);
    return cell;
}

/** Uses the first row as headers. Dotted headers like `address.city` become nested objects. */
function csvToObjects(input: string, delimiter: Delimiter, inferTypes: boolean): Record<string, unknown>[] {
    const [headers, ...rows] = parseCsv(input, delimiter);
    if (!headers) return [];

    return rows.map((cells, index) => {
        if (cells.length > headers.length) throw new Error(`Row ${index + 2} has ${cells.length} columns but the header has ${headers.length}.`);
        const record: Record<string, unknown> = {};
        headers.forEach((header, column) => {
            const cell = cells[column] ?? '';
            const path = header.split('.');
            let target = record;
            for (const key of path.slice(0, -1)) {
                if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
                target = target[key] as Record<string, unknown>;
            }
            target[path[path.length - 1]] = inferTypes ? inferCell(cell) : cell;
        });
        return record;
    });
}

function flatten(value: Record<string, unknown>, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
    for (const [key, inner] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (inner && typeof inner === 'object' && !Array.isArray(inner) && Object.keys(inner).length) {
            flatten(inner as Record<string, unknown>, path, out);
        } else {
            out[path] = inner;
        }
    }
    return out;
}

function csvField(value: unknown, delimiter: Delimiter): string {
    const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /["\r\n]/.test(text) || text.includes(delimiter) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Writes an array of objects as CSV, one column per key. Nested objects become dotted columns and
 * arrays are written as JSON.
 */
export function objectsToCsv(data: unknown, delimiter: Delimiter): string {
    const items = Array.isArray(data) ? data : [data];
    const records = items.map((item): Record<string, unknown> =>
        item && typeof item === 'object' && !Array.isArray(item) ? flatten(item as Record<string, unknown>) : { value: item },
    );

    const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
    const lines = [columns, ...records.map((record) => columns.map((column) => record[column]))];
    return lines.map((cells) => cells.map((cell) => csvField(cell, delimiter)).join(delimiter)).join('\n');
}

/* ---------- TypeScript ---------- */

type TypeNode =
    | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' | 'null' }
    | { kind: 'array'; items: TypeNode | null }
    | { kind: 'object'; fields: { key: string; type: TypeNode; optional: boolean }[] }
    | { kind: 'union'; types: TypeNode[] };

/** Infers one type from every sample seen at the same position, so arrays of objects merge into one interface. */
function infer(samples: unknown[]): TypeNode | null {
    const types: TypeNode[] = [];
    const primitives = new Set<'string' | 'number' | 'boolean' | 'null'>();
    const objects: Record<string, unknown>[] = [];
    const arrays: unknown[][] = [];

    for (const sample of samples) {
        if (sample === null) primitives.add('null');
        else if (Array.isArray(sample)) arrays.push(sample);
        else if (typeof sample === 'object') objects.push(sample as Record<string, unknown>);
        else if (typeof sample === 'string') primitives.add('string');
        else if (typeof sample === 'number') primitives.add('number');
        else if (typeof sample === 'boolean') primitives.add('boolean');
    }

    if (objects.length) {
        const keys = [...new Set(objects.flatMap((object) => Object.keys(object)))];
        types.push({
            kind: 'object',
            fields: keys.map((key) => {
                const present = objects.filter((object) => key in object);
                return {
                    key,
                    type: infer(present.map((object) => object[key])) ?? { kind: 'primitive', name: 'null' },
                    optional: present.length < objects.length,
                };
            }),
        });
    }
    if (arrays.length) types.push({ kind: 'array', items: infer(arrays.flat()) });
    for (const name of ['string', 'number', 'boolean', 'null'] as const) {
        if (primitives.has(name)) types.push({ kind: 'primitive', name });
    }

    if (types.length === 0) return null;
    return types.length === 1 ? types[0] : { kind: 'union', types };
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function pascalCase(text: string): string {
    const words = text.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) ?? [];
    const name = words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('');
    return /^\d/.test(name) ? `T${name}` : name || 'Item';
}

/** Rough English singular for naming array item types: `users` → `User`, `categories` → `Category`. */
function singular(name: string): string {
    if (/ies$/i.test(name)) return name.slice(0, -3) + 'y';
    if (/(ss|us|is)$/i.test(name)) return name;
    if (/(x|ch|sh|ses)es$/i.test(name)) return name.slice(0, -2);
    if (/s$/i.test(name)) return name.slice(0, -1);
    return `${name}Item`;
}

export function jsonToTypeScript(data: unknown, rootName = 'Root'): string {
    const root = pascalCase(rootName);
    const declarations: { name: string; body: string }[] = [];
    const usedNames = new Set([root]);

    const uniqueName = (hint: string): string => {
        const base = pascalCase(hint);
        let name = base;
        for (let n = 2; usedNames.has(name); n++) name = `${base}${n}`;
        usedNames.add(name);
        return name;
    };

    const render = (node: TypeNode | null, hint: string, isRoot = false): string => {
        if (!node) return 'unknown';
        switch (node.kind) {
            case 'primitive':
                return node.name;
            case 'array': {
                const items = render(node.items, singular(hint));
                return node.items?.kind === 'union' ? `(${items})[]` : `${items}[]`;
            }
            case 'union':
                return node.types.map((type) => render(type, hint)).join(' | ');
            case 'object': {
                if (!node.fields.length) return 'Record<string, unknown>';
                // Children are declared while rendering the fields; the parent goes in front of them.
                const index = declarations.length;
                const lines = node.fields.map(({ key, type, optional }) => {
                    const property = IDENTIFIER.test(key) ? key : JSON.stringify(key);
                    return `    ${property}${optional ? '?' : ''}: ${render(type, key)};`;
                });
                const body = `{\n${lines.join('\n')}\n}`;
                // Identical shapes share one interface.
                const existing = declarations.find((declaration) => declaration.body === body);
                if (existing && !isRoot) return existing.name;
                const name = isRoot ? root : uniqueName(hint);
                declarations.splice(index, 0, { name, body });
                return name;
            }
        }
    };

    const type = render(infer([data]), root, true);
    const output = declarations.map((declaration) => `export interface ${declaration.name} ${declaration.body}`);
    if (type !== root) output.unshift(`export type ${root} = ${type};`);
    return output.join('\n\n');
}
