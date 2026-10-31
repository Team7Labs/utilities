import {
    Binary,
    Braces,
    Calculator,
    CaseSensitive,
    Clock,
    FileCode,
    FileCode2,
    Fingerprint,
    Hash,
    KeyRound,
    Link2,
    type LucideIcon,
    Palette,
    QrCode,
    Regex,
    Terminal,
} from 'lucide-react';

export interface Tool {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    /** Sends data to the server. Everything else runs entirely in the browser. */
    usesServer?: boolean;
}

export const REPO_URL = 'https://github.com/Team7Labs/utilities';

export const tools: Tool[] = [
    {
        title: 'URL Shortener',
        description: 'One-time short links that delete themselves after the first visit or 24 hours. No tracking.',
        href: '/url-shortener',
        icon: Link2,
        usesServer: true,
    },
    {
        title: 'QR Code Generator',
        description: 'Turn text or a link into a QR code and download it as PNG or SVG.',
        href: '/qr-code',
        icon: QrCode,
    },
    {
        title: 'URL Encode / Decode',
        description: 'Percent-encode text for URLs, or decode it back, as you type.',
        href: '/url-encoder',
        icon: Binary,
    },
    {
        title: 'cURL Converter',
        description: 'Convert cURL commands into JavaScript fetch or axios code.',
        href: '/curl-converter',
        icon: Terminal,
    },
    {
        title: 'JSON Formatter',
        description: 'Validate, pretty-print, sort and minify JSON.',
        href: '/json-formatter',
        icon: Braces,
    },
    {
        title: 'JSON Converter',
        description: 'Convert between JSON, YAML and CSV, or generate TypeScript types from JSON.',
        href: '/json-converter',
        icon: FileCode,
    },
    {
        title: 'Regex Tester',
        description: 'Test regular expressions with live match highlighting, capture groups and a replace preview.',
        href: '/regex-tester',
        icon: Regex,
    },
    {
        title: 'JWT Decoder',
        description: 'Inspect a JSON Web Token’s header, claims and expiry, and verify HMAC signatures.',
        href: '/jwt-decoder',
        icon: KeyRound,
    },
    {
        title: 'Base64',
        description: 'Encode and decode Base64 for text and files.',
        href: '/base64',
        icon: FileCode2,
    },
    {
        title: 'UUID v7 / ULID',
        description: 'Generate time-ordered UUID v7 and ULID identifiers in bulk.',
        href: '/id-generator',
        icon: Fingerprint,
    },
    {
        title: 'Hash Generator',
        description: 'Create and verify bcrypt and Argon2id password hashes.',
        href: '/hash-generator',
        icon: Hash,
        usesServer: true,
    },
    {
        title: 'Color Converter',
        description: 'Convert HEX, RGB, HSL and OKLCH colors, and check WCAG contrast ratios.',
        href: '/color-converter',
        icon: Palette,
    },
    {
        title: 'Number Base Converter',
        description: 'Convert between decimal, hex, binary and octal, and try bitwise operations.',
        href: '/number-base',
        icon: Calculator,
    },
    {
        title: 'Timestamp Converter',
        description: 'Convert Unix timestamps, ISO 8601 and local times across time zones, with a live clock.',
        href: '/timestamp-converter',
        icon: Clock,
    },
    {
        title: 'Case Converter',
        description: 'Convert text to camelCase, snake_case, kebab-case, Title Case and more, or slugify it.',
        href: '/case-converter',
        icon: CaseSensitive,
    },
];

/**
 * Case-insensitive match on title and description, used by the home page and the header menu.
 */
export function searchTools(query: string): Tool[] {
    const needle = query.trim().toLowerCase();
    return tools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(needle));
}
