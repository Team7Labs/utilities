import { useSyncExternalStore } from 'react';

export type Appearance = 'light' | 'dark';

/** Reads the saved theme. Anything other than "light" (including no choice yet) means dark. */
function savedAppearance(): Appearance {
    try {
        return localStorage.getItem('appearance') === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
}

function applyTheme(appearance: Appearance) {
    document.documentElement.classList.toggle('dark', appearance === 'dark');
}

export function initializeTheme() {
    applyTheme(savedAppearance());
}

// Shared so the theme button and the keyboard shortcut always agree.
let current: Appearance | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function toggleAppearance() {
    const next = (current ?? savedAppearance()) === 'dark' ? 'light' : 'dark';
    current = next;
    applyTheme(next);
    try {
        localStorage.setItem('appearance', next);
    } catch {
        // Storage can be unavailable (e.g. private mode); the theme still applies for this page.
    }
    listeners.forEach((listener) => listener());
}

export function useAppearance() {
    const appearance = useSyncExternalStore(
        subscribe,
        () => (current ??= savedAppearance()),
        (): Appearance => 'dark',
    );
    return { appearance, toggleAppearance };
}
