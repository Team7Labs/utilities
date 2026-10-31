<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToolPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_tool_page_is_public()
    {
        $pages = [
            '/' => 'home',
            '/privacy' => 'privacy',
            '/url-shortener' => 'url-shortener/index',
            '/url-encoder' => 'url-encoder/index',
            '/curl-converter' => 'curl-converter/index',
            '/json-formatter' => 'json-formatter/index',
            '/jwt-decoder' => 'jwt-decoder/index',
            '/base64' => 'base64/index',
            '/id-generator' => 'id-generator/index',
            '/hash-generator' => 'hash-generator/index',
            '/color-converter' => 'color-converter/index',
            '/number-base' => 'number-base/index',
            '/qr-code' => 'qr-code/index',
            '/timestamp-converter' => 'timestamp-converter/index',
            '/json-converter' => 'json-converter/index',
            '/case-converter' => 'case-converter/index',
            '/regex-tester' => 'regex-tester/index',
        ];

        foreach ($pages as $url => $component) {
            $this->get($url)->assertOk()->assertInertia(fn ($page) => $page->component($component));
        }
    }
}
