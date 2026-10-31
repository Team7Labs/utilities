import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                <AppLogoIcon className="size-4.5" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate text-sm leading-tight font-semibold">Utilities</span>
                <span className="text-muted-foreground truncate text-xs leading-tight">Everyday tools</span>
            </div>
        </>
    );
}
