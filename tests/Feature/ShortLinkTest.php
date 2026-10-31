<?php

namespace Tests\Feature;

use App\Models\ShortLink;
use App\Services\UrlShortener;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class ShortLinkTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Creates a link and returns its code, read from the one-time flash message.
     */
    private function shorten(string $url): string
    {
        $response = $this->post('/url-shortener', ['url' => $url])
            ->assertRedirect('/url-shortener')
            ->assertSessionHas('shortUrl');

        return basename($response->getSession()->get('shortUrl'));
    }

    public function test_only_a_hash_of_the_code_and_the_encrypted_url_are_stored()
    {
        $url = 'https://example.com/some/long/path?x=1';
        $code = $this->shorten($url);

        $raw = DB::table('short_links')->sole();

        $this->assertSame(['code_index', 'original_url', 'created_at'], Schema::getColumnListing('short_links'));
        $this->assertSame(hash_hmac('sha256', $code, config('app.key')), $raw->code_index);
        $this->assertStringNotContainsString($code, json_encode($raw));
        $this->assertNotSame($url, $raw->original_url);
        $this->assertSame($url, decrypt($raw->original_url, false));
    }

    public function test_short_link_works_once_and_is_deleted_after_the_first_visit()
    {
        $code = $this->shorten('https://example.com');

        $this->get('/'.$code)
            ->assertRedirect('https://example.com')
            ->assertHeader('Referrer-Policy', 'no-referrer');

        $this->assertDatabaseCount('short_links', 0);
        $this->get('/'.$code)->assertNotFound();
    }

    public function test_expired_links_stop_working_and_are_pruned()
    {
        $old = $this->shorten('https://old.example.com');

        $this->travel(ShortLink::LIFETIME_HOURS)->hours();
        $new = $this->shorten('https://new.example.com');

        $this->get('/'.$old)->assertNotFound();
        $this->assertDatabaseCount('short_links', 2);

        $this->artisan('model:prune', ['--model' => [ShortLink::class]])->assertSuccessful();

        $this->assertDatabaseCount('short_links', 1);
        $this->get('/'.$new)->assertRedirect('https://new.example.com');
    }

    public function test_tampered_urls_are_not_followed()
    {
        $code = $this->shorten('https://example.com');
        DB::table('short_links')->update(['original_url' => 'not-a-valid-ciphertext']);

        $this->get('/'.$code)->assertNotFound();
    }

    public function test_unknown_code_returns_not_found()
    {
        $this->get('/abcdefg')->assertNotFound();
    }

    public function test_short_links_are_at_the_top_level_and_never_shadow_a_page()
    {
        Str::createRandomStringsUsingSequence(['privacy', 'Abc1234']);
        $code = app(UrlShortener::class)->shorten('https://example.com');
        Str::createRandomStringsNormally();

        $this->assertSame('Abc1234', $code);
        $this->get('/privacy')->assertOk()->assertInertia(fn ($page) => $page->component('privacy'));
        $this->get('/Abc1234')->assertRedirect('https://example.com');
    }

    public function test_invalid_urls_are_rejected()
    {
        $this->post('/url-shortener', ['url' => 'javascript:alert(1)'])
            ->assertSessionHasErrors('url');
    }
}
