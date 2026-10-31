import { CopyButton } from '@/components/copy-button';
import { BROWSER_ONLY_NOTE, ToolHeader } from '@/components/tool-header';
import { editorClass, PanelError, ToolPanel } from '@/components/tool-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { decodeJwt, verificationKind, verifyJwt, type DecodedJwt } from '@/lib/jwt';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { CircleCheck, CircleX, Clock, Eraser, KeyRound, LoaderCircle, ShieldQuestion, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// HS256, secret "your-256-bit-secret".
const SAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const CLAIMS: Record<string, string> = {
    iss: 'Issuer',
    sub: 'Subject',
    aud: 'Audience',
    exp: 'Expires at',
    nbf: 'Not before',
    iat: 'Issued at',
    jti: 'JWT ID',
    auth_time: 'Authenticated at',
    azp: 'Authorized party',
    scope: 'Scope',
    nonce: 'Nonce',
    sid: 'Session ID',
};

const TIME_CLAIMS = ['exp', 'nbf', 'iat', 'auth_time'];

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function fromNow(seconds: number, now: number): string {
    const diff = seconds - now / 1000;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
        ['second', 1],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(diff) >= size || unit === 'second') return relativeTime.format(Math.round(diff / size), unit);
    }
    return '';
}

function JsonBlock({ title, value, tone }: { title: string; value: unknown; tone: string }) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    return (
        <ToolPanel
            title={
                <span className="flex items-center gap-2">
                    <span className={cn('size-2.5 rounded-full', tone)} />
                    {title}
                </span>
            }
            actions={<CopyButton value={text} title={`Copy ${title.toLowerCase()}`} />}
        >
            <pre className="bg-muted/30 overflow-x-auto p-4 font-mono text-sm">{text}</pre>
        </ToolPanel>
    );
}

function Verify({ jwt }: { jwt: DecodedJwt }) {
    const kind = verificationKind(jwt.header.alg);
    const [key, setKey] = useState('');
    const [isBase64, setIsBase64] = useState(false);
    const [state, setState] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid' | 'error'; message?: string }>({ status: 'idle' });

    useEffect(() => {
        if (!key) {
            setState({ status: 'idle' });
            return;
        }
        let cancelled = false;
        setState({ status: 'checking' });
        verifyJwt(jwt, key, isBase64)
            .then((valid) => !cancelled && setState({ status: valid ? 'valid' : 'invalid' }))
            .catch((e: Error) => !cancelled && setState({ status: 'error', message: e.message }));
        return () => {
            cancelled = true;
        };
    }, [jwt, key, isBase64]);

    if (!kind) {
        return (
            <p className="text-muted-foreground p-4 text-sm">
                Signature verification isn't available for the <code className="font-mono">{String(jwt.header.alg)}</code> algorithm.
            </p>
        );
    }

    return (
        <div className="space-y-3 p-4">
            <Label htmlFor="jwt-key" className="text-sm">
                {kind === 'secret' ? 'Secret' : 'Public key (PEM)'}
            </Label>
            <Textarea
                id="jwt-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={kind === 'secret' ? 'your-256-bit-secret' : '-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----'}
                spellCheck={false}
                className={cn('font-mono text-sm', kind === 'secret' ? 'min-h-16' : 'min-h-32')}
            />
            {kind === 'secret' && (
                <div className="flex items-center gap-2">
                    <Checkbox id="secret-b64" checked={isBase64} onCheckedChange={(checked) => setIsBase64(checked === true)} />
                    <Label htmlFor="secret-b64" className="text-sm font-normal">
                        Secret is Base64-encoded
                    </Label>
                </div>
            )}
            <div className="min-h-6 text-sm">
                {state.status === 'checking' && (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <LoaderCircle className="h-4 w-4 animate-spin" /> Checking…
                    </span>
                )}
                {state.status === 'valid' && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                        <CircleCheck className="h-4 w-4" /> Signature verified
                    </span>
                )}
                {state.status === 'invalid' && (
                    <span className="text-destructive inline-flex items-center gap-1.5 font-medium">
                        <CircleX className="h-4 w-4" /> Invalid signature
                    </span>
                )}
                {state.status === 'error' && <span className="text-destructive">{state.message}</span>}
                {state.status === 'idle' && (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <ShieldQuestion className="h-4 w-4" /> Signature not verified. Enter the {kind === 'secret' ? 'secret' : 'public key'} to
                        check it.
                    </span>
                )}
            </div>
        </div>
    );
}

export default function JwtDecoder() {
    const [token, setToken] = useState('');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const result = useMemo(() => {
        if (!token.trim()) return null;
        try {
            return { jwt: decodeJwt(token), error: null };
        } catch (e) {
            return { jwt: null, error: (e as Error).message };
        }
    }, [token]);

    const jwt = result?.jwt ?? null;
    const payload = jwt && typeof jwt.payload === 'object' ? jwt.payload : null;
    const exp = typeof payload?.exp === 'number' ? payload.exp : null;
    const nbf = typeof payload?.nbf === 'number' ? payload.nbf : null;
    const status = !payload
        ? null
        : exp !== null && exp * 1000 < now
          ? { label: `Expired ${fromNow(exp, now)}`, tone: 'bad' }
          : nbf !== null && nbf * 1000 > now
            ? { label: `Not valid until ${fromNow(nbf, now)}`, tone: 'warn' }
            : { label: exp !== null ? `Valid, expires ${fromNow(exp, now)}` : 'No expiry set', tone: exp !== null ? 'good' : 'warn' };

    return (
        <AppLayout>
            <Head title="JWT Decoder" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
                <ToolHeader
                    icon={KeyRound}
                    title="JWT"
                    highlight="decoder"
                    description="Inspect a JSON Web Token's header and claims, and verify its signature."
                    note={BROWSER_ONLY_NOTE}
                />

                <section className="grid items-start gap-4 lg:grid-cols-2">
                    <div className="flex flex-col gap-4">
                        <ToolPanel
                            title={<Label htmlFor="jwt-input">Encoded token</Label>}
                            actions={
                                <>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setToken(SAMPLE)}>
                                        <WandSparkles className="h-4 w-4" />
                                        Sample
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setToken('')} disabled={!token}>
                                        <Eraser className="h-4 w-4" />
                                        Clear
                                    </Button>
                                </>
                            }
                            className={cn(result?.error && 'border-destructive/50')}
                        >
                            <Textarea
                                id="jwt-input"
                                autoFocus
                                value={token}
                                onChange={(e) => setToken(e.target.value.trim())}
                                placeholder="eyJhbGciOiJIUzI1NiIs…"
                                spellCheck={false}
                                className={cn(editorClass, 'min-h-48 break-all')}
                            />
                            {jwt && (
                                <p className="bg-muted/30 border-t p-4 font-mono text-sm break-all">
                                    <span className="text-primary">{jwt.parts[0]}</span>.
                                    <span className="text-violet-600 dark:text-violet-400">{jwt.parts[1]}</span>.
                                    <span className="text-amber-600 dark:text-amber-400">{jwt.parts[2]}</span>
                                </p>
                            )}
                            {result?.error && <PanelError>{result.error}</PanelError>}
                        </ToolPanel>

                        {jwt && (
                            <ToolPanel
                                title={
                                    <span className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-amber-500" />
                                        Signature
                                    </span>
                                }
                            >
                                <Verify jwt={jwt} />
                            </ToolPanel>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        {!jwt ? (
                            <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center text-sm">
                                <KeyRound className="h-6 w-6" />
                                Paste a token to see its contents.
                            </div>
                        ) : (
                            <>
                                {status && (
                                    <div
                                        className={cn(
                                            'flex items-center gap-2 rounded-2xl border p-4 text-sm font-medium',
                                            status.tone === 'good' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                                            status.tone === 'bad' && 'border-destructive/30 bg-destructive/5 text-destructive',
                                            status.tone === 'warn' && 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
                                        )}
                                    >
                                        <Clock className="h-4 w-4" />
                                        {status.label}
                                    </div>
                                )}

                                <JsonBlock title="Header" value={jwt.header} tone="bg-primary" />
                                <JsonBlock title="Payload" value={jwt.payload} tone="bg-violet-500" />

                                {payload && Object.keys(payload).some((claim) => claim in CLAIMS) && (
                                    <ToolPanel title="Claims">
                                        <dl className="divide-y text-sm">
                                            {Object.entries(payload)
                                                .filter(([claim]) => claim in CLAIMS)
                                                .map(([claim, value]) => (
                                                    <div key={claim} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-2.5">
                                                        <dt>
                                                            <span className="font-medium">{CLAIMS[claim]}</span>
                                                            <code className="text-muted-foreground block font-mono text-xs">{claim}</code>
                                                        </dt>
                                                        <dd className="min-w-0 break-words">
                                                            {TIME_CLAIMS.includes(claim) && typeof value === 'number' ? (
                                                                <>
                                                                    {new Date(value * 1000).toLocaleString()}
                                                                    <span className="text-muted-foreground block text-xs">
                                                                        {fromNow(value, now)} · <span className="font-mono">{value}</span>
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="font-mono text-xs leading-5">
                                                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                ))}
                                        </dl>
                                    </ToolPanel>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
