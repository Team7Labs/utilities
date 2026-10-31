import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { type ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <AppHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <AppFooter />
        </div>
    );
}
