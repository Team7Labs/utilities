<?php

namespace App\Http\Controllers;

use App\Services\UrlShortener;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShortLinkController extends Controller
{
    public function __construct(private UrlShortener $shortener) {}

    /**
     * Show the URL shortener.
     */
    public function index(): Response
    {
        return Inertia::render('url-shortener/index');
    }

    /**
     * Create a new short link. The short URL is shown once, since the code isn't stored.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:2048', 'url:http,https'],
        ]);

        $code = $this->shortener->shorten($validated['url']);

        return to_route('short-links.index')
            ->with('shortUrl', route('short-links.redirect', $code));
    }

    /**
     * Redirect a short code to its destination, deleting the link so it can't be used again.
     */
    public function redirect(string $code): RedirectResponse
    {
        $url = $this->shortener->consume($code);

        abort_unless($url, 404);

        return redirect()->away($url)->header('Referrer-Policy', 'no-referrer');
    }
}
