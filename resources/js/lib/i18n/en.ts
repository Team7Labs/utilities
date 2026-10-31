import { type ReactNode } from 'react';

/**
 * Interface text. Functions take formatted fragments, such as code, and place them in the sentence.
 */
export const en = {
    header: {
        tools: 'Tools',
        allTools: 'All tools',
        searchTools: 'Search tools…',
        searchLabel: 'Search tools',
        noMatch: (query: string) => `No tools match “${query}”`,
        privacy: 'Privacy',
        github: 'Source code on GitHub',
        darkMode: 'Switch to dark mode',
        lightMode: 'Switch to light mode',
    },
    home: {
        badge: 'Free, fast, no account needed',
        title: 'Handy tools for devs,',
        highlight: 'all in one place.',
        subtitle: 'Small utilities for everyday tasks. Pick one to get started.',
        moreSoon: 'More tools coming soon',
    },
    footer: {
        builtBy: 'Built for devs, by devs @',
    },
    browserOnlyNote: 'Runs entirely in your browser. Nothing is sent to the server.',
    privacy: {
        pageTitle: 'Privacy',
        title: 'Your privacy',
        highlight: 'matters',
        intro: 'Almost every tool here runs entirely in your browser, so what you paste never reaches our server. Here is exactly what does, and what happens to it.',
        checkCode: 'Check our code on GitHub',
        updated: (date: string) => `Last updated ${date}`,
        updatedDate: 'October 31, 2026',
        browserTitle: 'Runs in your browser',
        browserBody:
            'These tools do all their work on your device. Your input is never sent anywhere, and you can confirm it in your browser’s developer tools: the Network tab stays quiet while you use them.',
        serverTitle: 'Tools that use our server',
        serverBody: 'Two tools can’t work without a server. Here’s what they send and keep.',
        hashPoints: [
            'Your text is sent over HTTPS so the server can run bcrypt or Argon2id.',
            'It is hashed in memory and sent back. It is never saved or logged.',
            'Requests are rate limited to keep the service fair.',
        ],
        shortenerPoints: [
            'The destination link is stored encrypted, next to a keyed hash of the short code. The code itself is never stored.',
            'Each link is deleted on its first visit. Unopened links stop working after 24 hours and are deleted within a day.',
            'No click tracking, and visitors are redirected without a referrer.',
            'Nothing ties a link to you: no account, cookie or IP address is stored with it.',
        ],
        dontTitle: 'What we don’t do',
        dontPoints: [
            'No accounts, no sign-up, no email addresses.',
            'No analytics, tracking pixels, fingerprinting or ads.',
            'No third-party requests: fonts and scripts are served from our own server.',
            'We don’t keep what you put into our tools, so there’s nothing for us to sell or share. Short links are the one exception, and they stop working after one visit or 24 hours.',
        ],
        technicalTitle: 'Technical data and cookies',
        technicalBody: 'Like any website, a few things are needed to keep it secure and working:',
        sessionCookie: (xsrf: ReactNode): ReactNode => [
            'A session cookie and an ',
            xsrf,
            ' cookie protect forms from cross-site attacks. The session is kept encrypted in the cookie itself, not on our server, and expires after 2 hours of inactivity.',
        ],
        rateLimit: 'Rate limits count requests per IP address for about a minute.',
        theme: 'Your light or dark theme choice is saved in your browser’s local storage and never sent to us.',
        trustTitle: 'Don’t take our word for it',
        trustBody: (controllers: ReactNode, shortener: ReactNode, js: ReactNode): ReactNode => [
            'The whole app is open source. The server-side code that handles your data is in ',
            controllers,
            ' and ',
            shortener,
            ', and every browser-only tool lives in ',
            js,
            '.',
        ],
    },
};

/** Shape of the interface text. */
export type Messages = typeof en;
