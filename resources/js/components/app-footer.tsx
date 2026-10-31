import { useI18n } from '@/lib/i18n';

export function AppFooter() {
    const { t } = useI18n();

    return (
        <footer className="border-t">
            <div className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 text-sm md:px-8">
                <p>
                    {t.footer.builtBy}{' '}
                    <a
                        href="https://team7labs.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary font-medium underline-offset-4 transition-colors hover:underline"
                    >
                        Team7Labs
                    </a>
                    .
                </p>
                <span className="font-mono text-xs">v{__APP_VERSION__}</span>
            </div>
        </footer>
    );
}
