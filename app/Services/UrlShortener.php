<?php

namespace App\Services;

use App\Models\ShortLink;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Only a keyed HMAC of each code is stored, so codes can't be read back from the database. The
 * destination URL is stored with Laravel encryption, which also detects any tampering.
 */
class UrlShortener
{
    public const CODE_LENGTH = 7;

    /**
     * Stores a link and returns its code. This is the only time the code is known.
     */
    public function shorten(string $url): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = Str::random(self::CODE_LENGTH);
            $index = $this->index($code);

            // Codes share the top-level path with pages, so skip one that matches a page like /privacy.
            if ($this->isPagePath($code) || ShortLink::whereKey($index)->exists()) {
                continue;
            }

            ShortLink::create(['code_index' => $index, 'original_url' => $url]);

            return $code;
        }

        throw new RuntimeException('Unable to generate a unique short code.');
    }

    /**
     * Finds a link and deletes it in the same step, so it works exactly once.
     * Returns the destination URL, or null if the link is unknown, expired or already used.
     */
    public function consume(string $code): ?string
    {
        $link = ShortLink::active()->find($this->index($code));

        try {
            $url = $link?->original_url;
        } catch (DecryptException) {
            return null;
        }

        // The conditional delete is atomic: if two visits race, only one sees a deleted row.
        if (! $url || ShortLink::whereKey($link->getKey())->delete() !== 1) {
            return null;
        }

        return $url;
    }

    private function index(string $value): string
    {
        return hash_hmac('sha256', $value, config('app.key'));
    }

    private function isPagePath(string $code): bool
    {
        foreach (Route::getRoutes() as $route) {
            if ($route->uri() === $code) {
                return true;
            }
        }

        return false;
    }
}
