import { useEffect } from 'react';

/** True while the user is typing, or moving through a menu where letters jump to items. */
function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || target.matches('input, textarea, select') || target.closest('[role="menu"]') !== null;
}

/**
 * Single-key shortcuts, keyed by `KeyboardEvent.code` so they work on any keyboard layout. They are ignored while typing and when Ctrl, Cmd or Alt is held, so browser
 * shortcuts like Cmd+L and Ctrl+D keep working.
 */
export function useShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
            const action = shortcuts[e.code];
            if (!action) return;
            e.preventDefault();
            action();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [shortcuts]);
}
