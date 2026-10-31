import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { useI18n } from '@/lib/i18n';
import { Moon, Sun } from 'lucide-react';

export default function AppearanceToggle() {
    const { appearance, toggleAppearance } = useAppearance();
    const { t } = useI18n();
    const label = appearance === 'dark' ? t.header.lightMode : t.header.darkMode;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
            onClick={toggleAppearance}
            title={`${label} (D)`}
            aria-label={label}
            aria-keyshortcuts="D"
        >
            {appearance === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
    );
}
