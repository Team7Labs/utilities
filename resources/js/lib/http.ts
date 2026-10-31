/**
 * Minimal JSON POST helper that sends Laravel's XSRF token from its cookie.
 */
export class ValidationError extends Error {
    constructor(public errors: Record<string, string[]>) {
        super(Object.values(errors)[0]?.[0] ?? 'The request was invalid.');
    }
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: JSON.stringify(body),
    });

    if (response.status === 422) throw new ValidationError((await response.json()).errors);
    if (response.status === 429) throw new Error('Too many requests. Wait a minute and try again.');
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);

    return response.json();
}
