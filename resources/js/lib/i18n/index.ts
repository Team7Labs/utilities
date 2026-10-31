import { en, type Messages } from './en';

/** Interface text. English only for now; kept in one place so the copy is easy to find and edit. */
export function useI18n(): { t: Messages } {
    return { t: en };
}
