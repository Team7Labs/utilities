export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    flash: { shortUrl?: string | null };
    [key: string]: unknown;
}
