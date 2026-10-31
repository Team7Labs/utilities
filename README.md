# Utilities

Small, fast tools for everyday developer tasks. Free, no account needed, and most tools run entirely in your browser.

Built with Laravel 12, Inertia 2, React 19, TypeScript and Tailwind CSS.

## Tools

| Tool                  | What it does                                                                     | Runs in    |
| --------------------- | -------------------------------------------------------------------------------- | ---------- |
| URL Shortener         | One-time short links that delete themselves after the first visit or 24 hours    | Server     |
| QR Code Generator     | Turn text or a link into a QR code, download as PNG or SVG                       | Browser    |
| URL Encode / Decode   | Percent-encode text for URLs, or decode it back                                  | Browser    |
| cURL Converter        | Convert cURL commands into JavaScript `fetch` or `axios` code                    | Browser    |
| JSON Formatter        | Validate, pretty-print, sort and minify JSON                                     | Browser    |
| JSON Converter        | Convert between JSON, YAML and CSV, or generate TypeScript types                 | Browser    |
| Regex Tester          | Live match highlighting, capture groups and a replace preview                    | Browser    |
| JWT Decoder           | Inspect header, claims and expiry, and verify HMAC signatures                    | Browser    |
| Base64                | Encode and decode Base64 for text and files                                      | Browser    |
| UUID v7 / ULID        | Generate time-ordered identifiers in bulk                                        | Browser    |
| Hash Generator        | Create and verify bcrypt and Argon2id password hashes                            | Server     |
| Color Converter       | Convert HEX, RGB, HSL and OKLCH, and check WCAG contrast                         | Browser    |
| Number Base Converter | Convert between decimal, hex, binary and octal, and try bitwise operations       | Browser    |
| Timestamp Converter   | Convert Unix timestamps, ISO 8601 and local times across time zones              | Browser    |
| Case Converter        | camelCase, snake_case, kebab-case, Title Case and more, or slugify               | Browser    |

Only the URL Shortener and Hash Generator send data to the server. The app's Privacy page (`/privacy`) explains exactly what they store.

## Requirements

- PHP 8.2+ and Composer
- [Bun](https://bun.sh) (or Node.js 22+)
- PostgreSQL

## Getting started

```bash
composer install
bun install

cp .env.example .env
php artisan key:generate

# Create the database set in .env (default: utilities), then:
php artisan migrate

composer dev
```

`composer dev` starts the Laravel server, Vite, the queue worker, the log viewer and the scheduler together. Open **http://localhost:8000**. Port 5173 is Vite's dev server and only serves assets.

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `composer dev`      | Run everything for local development         |
| `bun run build`     | Build production assets into `public/build`  |
| `bun run build:ssr` | Build client assets and the SSR bundle       |
| `bun run format`    | Format frontend code with Prettier           |
| `bun run lint`      | Lint and fix frontend code with ESLint       |
| `vendor/bin/pint`   | Format PHP code                              |
| `php artisan test`  | Run the test suite                           |

Tests use a separate PostgreSQL database named `utilities_testing` (see `phpunit.xml`), so create it before running them.

## Project structure

```
app/Http/Controllers   Hash Generator and URL Shortener endpoints
app/Services           Short link code generation
resources/js/pages     One folder per tool, plus home and privacy
resources/js/lib       Tool logic, tool list (tools.ts) and interface text (i18n)
routes/web.php         Routes for every page and API endpoint
```

To add a tool, create a page in `resources/js/pages/<tool>/index.tsx`, register its route in `routes/web.php`, and add it to `resources/js/lib/tools.ts` so it shows on the home page and in the header menu.

## License

[MIT](LICENSE.md) © Team7Labs

---

Built for devs, by devs @ [Team7Labs](https://team7labs.com).
