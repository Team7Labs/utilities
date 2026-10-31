import AppearanceToggle from '@/components/appearance-toggle';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toggleAppearance } from '@/hooks/use-appearance';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useI18n } from '@/lib/i18n';
import { REPO_URL, searchTools } from '@/lib/tools';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Github, LayoutGrid, Search, ShieldCheck } from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import AppLogo from './app-logo';

const SHORTCUTS = { KeyD: toggleAppearance };

export function AppHeader() {
    const path = usePage().url.split('?')[0];
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();
    const visible = searchTools(query);

    useShortcuts(SHORTCUTS);

    const onOpenChange = (next: boolean) => {
        setOpen(next);
        setQuery('');
        // The menu focuses itself when it opens, so take focus back for the search box afterwards.
        if (next) requestAnimationFrame(() => searchRef.current?.focus());
    };

    const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape' || e.key === 'Tab') return;
        // Keep the menu's type-ahead from stealing letters typed into the search box.
        e.stopPropagation();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        } else if (e.key === 'Enter' && visible[0]) {
            e.preventDefault();
            onOpenChange(false);
            router.visit(visible[0].href);
        }
    };

    return (
        <header className="bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
                <Link href="/" prefetch className="flex items-center gap-1 rounded-lg">
                    <AppLogo />
                </Link>

                <div className="flex items-center gap-1">
                    <DropdownMenu open={open} onOpenChange={onOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-1.5">
                                <LayoutGrid className="h-4 w-4" />
                                {t.header.tools}
                                <ChevronDown className="h-4 w-4 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent ref={menuRef} align="end" className="w-72 p-0">
                            <label className="flex items-center gap-2 border-b px-3">
                                <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                                <span className="sr-only">{t.header.searchLabel}</span>
                                <input
                                    ref={searchRef}
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={onSearchKeyDown}
                                    placeholder={t.header.searchTools}
                                    className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-sm outline-none"
                                />
                            </label>
                            <div className="max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto p-1">
                                {!query && (
                                    <>
                                        <DropdownMenuItem asChild>
                                            <Link href="/" className={cn(path === '/' && 'bg-accent text-accent-foreground')}>
                                                <LayoutGrid className="h-4 w-4" />
                                                {t.header.allTools}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">{t.header.tools}</DropdownMenuLabel>
                                    </>
                                )}
                                {visible.map((tool) => (
                                    <DropdownMenuItem key={tool.href} asChild>
                                        <Link href={tool.href} prefetch className={cn(path === tool.href && 'bg-accent text-accent-foreground')}>
                                            <tool.icon className="h-4 w-4" />
                                            {tool.title}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                {visible.length === 0 && (
                                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t.header.noMatch(query)}</p>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" asChild className={cn('gap-1.5', path === '/privacy' && 'bg-accent text-accent-foreground')}>
                        <Link href="/privacy" prefetch aria-label={t.header.privacy}>
                            <ShieldCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">{t.header.privacy}</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-md">
                        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" title={t.header.github} aria-label={t.header.github}>
                            <Github className="h-5 w-5" />
                        </a>
                    </Button>
                    <AppearanceToggle />
                </div>
            </div>
        </header>
    );
}
