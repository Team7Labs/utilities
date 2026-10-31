/**
 * Parses a cURL command and generates equivalent fetch / axios code.
 */

export interface ParsedCurl {
    url: string;
    method: string;
    headers: [string, string][];
    basicAuth: { username: string; password: string } | null;
    body: Body | null;
    warnings: string[];
}

type Body =
    | { kind: 'json'; value: unknown }
    | { kind: 'urlencoded'; pairs: [string, string][] }
    | { kind: 'raw'; value: string }
    | { kind: 'form'; fields: { name: string; value: string; file: boolean }[] };

/** Short options that take a value, mapped to their long name. */
const SHORT_WITH_VALUE: Record<string, string> = {
    X: 'request',
    H: 'header',
    d: 'data',
    F: 'form',
    u: 'user',
    A: 'user-agent',
    b: 'cookie',
    e: 'referer',
    o: 'output',
    m: 'max-time',
    x: 'proxy',
    w: 'write-out',
    T: 'upload-file',
    c: 'cookie-jar',
    E: 'cert',
    K: 'config',
    r: 'range',
    U: 'proxy-user',
    Y: 'speed-limit',
    y: 'speed-time',
    z: 'time-cond',
    C: 'continue-at',
    P: 'ftp-port',
    Q: 'quote',
    t: 'telnet-option',
};

const SHORT_FLAGS: Record<string, string> = {
    G: 'get',
    I: 'head',
    L: 'location',
    k: 'insecure',
    s: 'silent',
    S: 'show-error',
    v: 'verbose',
    i: 'include',
    f: 'fail',
    N: 'no-buffer',
    O: 'remote-name',
    J: 'remote-header-name',
    '#': 'progress-bar',
    '0': 'http1.0',
    '1': 'tlsv1',
    '2': 'sslv2',
    '3': 'sslv3',
    '4': 'ipv4',
    '6': 'ipv6',
    q: 'disable',
    Z: 'parallel',
};

const LONG_WITH_VALUE = new Set([
    ...Object.values(SHORT_WITH_VALUE),
    'url',
    'data-raw',
    'data-ascii',
    'data-binary',
    'data-urlencode',
    'json',
    'form-string',
    'connect-timeout',
    'retry',
    'retry-delay',
    'retry-max-time',
    'max-redirs',
    'cacert',
    'capath',
    'key',
    'pass',
    'resolve',
    'interface',
    'limit-rate',
    'oauth2-bearer',
    'aws-sigv4',
    'proto',
    'proto-redir',
    'unix-socket',
    'dns-servers',
    'happy-eyeballs-timeout-ms',
    'expect100-timeout',
    'variable',
    'url-query',
]);

/**
 * Splits a shell command into arguments (POSIX-style quoting, plus $'…' and line continuations).
 */
export function tokenize(command: string): string[] {
    const tokens: string[] = [];
    const text = command.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ');
    let current = '';
    let inToken = false;
    let i = 0;

    while (i < text.length) {
        const ch = text[i];

        if (/\s/.test(ch)) {
            if (inToken) {
                tokens.push(current);
                current = '';
                inToken = false;
            }
            i++;
            continue;
        }

        inToken = true;

        if (ch === "'") {
            const end = text.indexOf("'", i + 1);
            if (end === -1) throw new Error('Unclosed single quote.');
            current += text.slice(i + 1, end);
            i = end + 1;
        } else if (ch === '$' && text[i + 1] === "'") {
            i += 2;
            while (i < text.length && text[i] !== "'") {
                if (text[i] === '\\' && i + 1 < text.length) {
                    const next = text[i + 1];
                    const escapes: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' };
                    current += escapes[next] ?? next;
                    i += 2;
                } else {
                    current += text[i++];
                }
            }
            if (i >= text.length) throw new Error("Unclosed $'…' quote.");
            i++;
        } else if (ch === '"') {
            i++;
            while (i < text.length && text[i] !== '"') {
                if (text[i] === '\\' && '"\\$`\n'.includes(text[i + 1])) {
                    current += text[i + 1];
                    i += 2;
                } else {
                    current += text[i++];
                }
            }
            if (i >= text.length) throw new Error('Unclosed double quote.');
            i++;
        } else if (ch === '\\' && i + 1 < text.length) {
            current += text[i + 1];
            i += 2;
        } else {
            current += ch;
            i++;
        }
    }

    if (inToken) tokens.push(current);
    return tokens;
}

/**
 * Expands arguments into [option, value] pairs, handling bundled short flags like -sSL and -XPOST.
 */
function readOptions(args: string[]): { options: [string, string | null][]; positional: string[] } {
    const options: [string, string | null][] = [];
    const positional: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--') && arg.length > 2) {
            const name = arg.slice(2);
            if (LONG_WITH_VALUE.has(name)) {
                options.push([name, args[++i] ?? '']);
            } else {
                options.push([name, null]);
            }
        } else if (arg.startsWith('-') && arg.length > 1) {
            for (let j = 1; j < arg.length; j++) {
                const flag = arg[j];
                if (SHORT_WITH_VALUE[flag]) {
                    const rest = arg.slice(j + 1);
                    options.push([SHORT_WITH_VALUE[flag], rest !== '' ? rest : (args[++i] ?? '')]);
                    break;
                }
                options.push([SHORT_FLAGS[flag] ?? `-${flag}`, null]);
            }
        } else {
            positional.push(arg);
        }
    }

    return { options, positional };
}

function parseUrlencoded(data: string): [string, string][] | null {
    if (!data || !/^[^=&]+=[^&]*(&[^=&]+=[^&]*)*$/.test(data)) return null;
    try {
        return data.split('&').map((pair) => {
            const index = pair.indexOf('=');
            const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, ' '));
            return [decode(pair.slice(0, index)), decode(pair.slice(index + 1))];
        });
    } catch {
        return null;
    }
}

export function parseCurl(command: string): ParsedCurl {
    const args = tokenize(command.trim());
    // The leading "curl" is optional, so a bare URL (plus options) works too.
    if (/^curl(\.exe)?$/i.test(args[0] ?? '')) args.shift();

    const { options, positional } = readOptions(args);
    const headers: [string, string][] = [];
    const data: string[] = [];
    const form: { name: string; value: string; file: boolean }[] = [];
    const warnings: string[] = [];
    let url = positional[0] ?? '';
    let method: string | null = null;
    let basicAuth: ParsedCurl['basicAuth'] = null;
    let asGet = false;
    let isJson = false;

    for (const [name, value] of options) {
        const v = value ?? '';
        switch (name) {
            case 'url':
                url = v;
                break;
            case 'request':
                method = v.toUpperCase();
                break;
            case 'header': {
                const index = v.indexOf(':');
                if (index > 0) headers.push([v.slice(0, index).trim(), v.slice(index + 1).trim()]);
                break;
            }
            case 'data':
            case 'data-ascii':
            case 'data-binary':
                if (v.startsWith('@')) warnings.push(`Data is read from the file "${v.slice(1)}"; paste its contents into the body instead.`);
                data.push(name === 'data-binary' ? v : v.replace(/[\r\n]/g, ''));
                break;
            case 'data-raw':
                data.push(v);
                break;
            case 'data-urlencode': {
                const index = v.indexOf('=');
                data.push(index > 0 ? `${v.slice(0, index)}=${encodeURIComponent(v.slice(index + 1))}` : encodeURIComponent(v.replace(/^=/, '')));
                break;
            }
            case 'json':
                data.push(v);
                isJson = true;
                break;
            case 'form':
            case 'form-string': {
                const index = v.indexOf('=');
                const fieldValue = v.slice(index + 1);
                const file = name === 'form' && (fieldValue.startsWith('@') || fieldValue.startsWith('<'));
                form.push({ name: v.slice(0, index), value: file ? fieldValue.slice(1).split(';')[0] : fieldValue, file });
                break;
            }
            case 'user': {
                const index = v.indexOf(':');
                basicAuth = index >= 0 ? { username: v.slice(0, index), password: v.slice(index + 1) } : { username: v, password: '' };
                break;
            }
            case 'oauth2-bearer':
                headers.push(['Authorization', `Bearer ${v}`]);
                break;
            case 'user-agent':
                headers.push(['User-Agent', v]);
                break;
            case 'referer':
                headers.push(['Referer', v]);
                break;
            case 'cookie':
                if (v.includes('=')) headers.push(['Cookie', v]);
                else warnings.push(`Cookies are read from the file "${v}", which can't be converted.`);
                break;
            case 'get':
                asGet = true;
                break;
            case 'head':
                method = 'HEAD';
                break;
            case 'insecure':
                warnings.push('--insecure (skip TLS verification) has no equivalent in fetch or axios in the browser.');
                break;
            case 'upload-file':
                warnings.push(`--upload-file "${v}" uploads a file; send its contents as the body instead.`);
                method ??= 'PUT';
                break;
            case 'url-query':
                url += (url.includes('?') ? '&' : '?') + v;
                break;
        }
    }

    if (!url) throw new Error('No URL found in the command.');
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `http://${url}`;

    if (isJson) {
        if (!headers.some(([h]) => h.toLowerCase() === 'content-type')) headers.push(['Content-Type', 'application/json']);
        if (!headers.some(([h]) => h.toLowerCase() === 'accept')) headers.push(['Accept', 'application/json']);
    }

    if (headers.some(([h]) => h.toLowerCase() === 'cookie')) {
        warnings.push('Browsers do not allow setting the Cookie header from JavaScript; this only works in Node.js.');
    }

    let body: Body | null = null;
    const joined = data.join('&');

    if (asGet && data.length) {
        url += (url.includes('?') ? '&' : '?') + joined;
    } else if (form.length) {
        body = { kind: 'form', fields: form };
        const index = headers.findIndex(([h]) => h.toLowerCase() === 'content-type');
        if (index >= 0 && headers[index][1].toLowerCase().startsWith('multipart/form-data')) headers.splice(index, 1);
    } else if (data.length) {
        const contentType = headers.find(([h]) => h.toLowerCase() === 'content-type')?.[1].toLowerCase() ?? '';
        const pairs = contentType === '' || contentType.startsWith('application/x-www-form-urlencoded') ? parseUrlencoded(joined) : null;

        if (contentType.includes('json')) {
            try {
                body = { kind: 'json', value: JSON.parse(joined) };
            } catch {
                body = { kind: 'raw', value: joined };
            }
        } else if (pairs) {
            body = { kind: 'urlencoded', pairs };
            const index = headers.findIndex(([h]) => h.toLowerCase() === 'content-type');
            if (index >= 0) headers.splice(index, 1);
        } else {
            body = { kind: 'raw', value: joined };
            if (!contentType) headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
        }
    }

    return {
        url,
        method: method ?? (asGet ? 'GET' : body ? 'POST' : 'GET'),
        headers,
        basicAuth,
        body,
        warnings,
    };
}

/* ---------- Code generation ---------- */

const IDENT = /^[A-Za-z_$][\w$]*$/;

function str(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}'`;
}

function key(name: string): string {
    return IDENT.test(name) ? name : str(name);
}

/** Renders a JSON value as a JavaScript literal. */
function literal(value: unknown, depth: number): string {
    const pad = '  '.repeat(depth + 1);
    const close = '  '.repeat(depth);

    if (value === null) return 'null';
    if (typeof value === 'string') return str(value);
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const inline = `[${value.map((item) => literal(item, depth)).join(', ')}]`;
        if (value.every((item) => item === null || typeof item !== 'object') && inline.length <= 60) return inline;
        return `[\n${value.map((item) => `${pad}${literal(item, depth + 1)},`).join('\n')}\n${close}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return `{\n${entries.map(([k, v]) => `${pad}${key(k)}: ${literal(v, depth + 1)},`).join('\n')}\n${close}}`;
}

function objectBlock(entries: [string, string][], depth: number): string {
    const pad = '  '.repeat(depth + 1);
    return `{\n${entries.map(([k, v]) => `${pad}${key(k)}: ${v},`).join('\n')}\n${'  '.repeat(depth)}}`;
}

function formDataSetup(fields: { name: string; value: string; file: boolean }[]): string {
    const lines = fields.map((field) =>
        field.file
            ? `formData.append(${str(field.name)}, file); // file from ${str(field.value)}: use a File or Blob`
            : `formData.append(${str(field.name)}, ${str(field.value)});`,
    );
    return `const formData = new FormData();\n${lines.join('\n')}\n\n`;
}

function bodyExpression(body: Body, depth: number, forAxios: boolean): string {
    switch (body.kind) {
        case 'json':
            return forAxios ? literal(body.value, depth) : `JSON.stringify(${literal(body.value, depth)})`;
        case 'urlencoded':
            return `new URLSearchParams(${objectBlock(
                body.pairs.map(([k, v]) => [k, str(v)]),
                depth,
            )})`;
        case 'form':
            return 'formData';
        case 'raw':
            return str(body.value);
    }
}

function expectsJson(parsed: ParsedCurl): boolean {
    return (
        parsed.body?.kind === 'json' || parsed.headers.some(([h, v]) => ['accept', 'content-type'].includes(h.toLowerCase()) && v.includes('json'))
    );
}

export function toFetch(parsed: ParsedCurl): string {
    const headers: [string, string][] = parsed.headers.map(([k, v]) => [k, str(v)]);
    if (parsed.basicAuth) {
        headers.push(['Authorization', `'Basic ' + btoa(${str(`${parsed.basicAuth.username}:${parsed.basicAuth.password}`)})`]);
    }

    const options: [string, string][] = [];
    if (parsed.method !== 'GET') options.push(['method', str(parsed.method)]);
    if (headers.length) options.push(['headers', objectBlock(headers, 1)]);
    if (parsed.body) options.push(['body', bodyExpression(parsed.body, 1, false)]);

    const setup = parsed.body?.kind === 'form' ? formDataSetup(parsed.body.fields) : '';
    const call = options.length ? `fetch(${str(parsed.url)}, ${objectBlock(options, 0)})` : `fetch(${str(parsed.url)})`;
    const reader = parsed.method === 'HEAD' ? '' : `\n\nconst data = await response.${expectsJson(parsed) ? 'json' : 'text'}();\nconsole.log(data);`;

    return `${setup}const response = await ${call};${reader}`;
}

export function toAxios(parsed: ParsedCurl): string {
    const method = parsed.method.toLowerCase();
    const config: [string, string][] = [];

    if (parsed.headers.length)
        config.push([
            'headers',
            objectBlock(
                parsed.headers.map(([k, v]) => [k, str(v)]),
                1,
            ),
        ]);
    if (parsed.basicAuth) {
        config.push([
            'auth',
            objectBlock(
                [
                    ['username', str(parsed.basicAuth.username)],
                    ['password', str(parsed.basicAuth.password)],
                ],
                1,
            ),
        ]);
    }

    const setup = parsed.body?.kind === 'form' ? formDataSetup(parsed.body.fields) : '';
    const url = str(parsed.url);
    const data = parsed.body ? bodyExpression(parsed.body, 0, true) : null;
    let call: string;

    if (['post', 'put', 'patch'].includes(method)) {
        const args = [url, data ?? (config.length ? 'null' : null), config.length ? objectBlock(config, 0) : null].filter((arg) => arg !== null);
        call = `axios.${method}(${args.join(', ')})`;
    } else if (['get', 'delete', 'head', 'options'].includes(method)) {
        if (data) config.push(['data', bodyExpression(parsed.body!, 1, true)]);
        call = config.length ? `axios.${method}(${url}, ${objectBlock(config, 0)})` : `axios.${method}(${url})`;
    } else {
        const all: [string, string][] = [['method', str(parsed.method)], ['url', url], ...config];
        if (data) all.push(['data', bodyExpression(parsed.body!, 1, true)]);
        call = `axios(${objectBlock(all, 0)})`;
    }

    return `import axios from 'axios';\n\n${setup}const response = await ${call};\nconsole.log(response.data);`;
}
