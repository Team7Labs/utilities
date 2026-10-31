<?php

use App\Http\Controllers\HashController;
use App\Http\Controllers\ShortLinkController;
use App\Services\UrlShortener;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('home');
})->name('home');

Route::inertia('privacy', 'privacy')->name('privacy');

// Tools that run entirely in the browser.
Route::inertia('url-encoder', 'url-encoder/index')->name('url-encoder');
Route::inertia('curl-converter', 'curl-converter/index')->name('curl-converter');
Route::inertia('json-formatter', 'json-formatter/index')->name('json-formatter');
Route::inertia('jwt-decoder', 'jwt-decoder/index')->name('jwt-decoder');
Route::inertia('base64', 'base64/index')->name('base64');
Route::inertia('id-generator', 'id-generator/index')->name('id-generator');
Route::inertia('color-converter', 'color-converter/index')->name('color-converter');
Route::inertia('number-base', 'number-base/index')->name('number-base');
Route::inertia('qr-code', 'qr-code/index')->name('qr-code');
Route::inertia('timestamp-converter', 'timestamp-converter/index')->name('timestamp-converter');
Route::inertia('json-converter', 'json-converter/index')->name('json-converter');
Route::inertia('case-converter', 'case-converter/index')->name('case-converter');
Route::inertia('regex-tester', 'regex-tester/index')->name('regex-tester');

Route::get('hash-generator', [HashController::class, 'index'])->name('hash-generator');
Route::middleware('throttle:20,1')->group(function () {
    Route::post('hash-generator/hash', [HashController::class, 'hash'])->name('hash-generator.hash');
    Route::post('hash-generator/verify', [HashController::class, 'verify'])->name('hash-generator.verify');
});

Route::get('url-shortener', [ShortLinkController::class, 'index'])->name('short-links.index');
Route::post('url-shortener', [ShortLinkController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('short-links.store');

// Short links live at the top level, so this must stay the last route: every page above takes precedence.
Route::get('{code}', [ShortLinkController::class, 'redirect'])
    ->where('code', '[A-Za-z0-9]{'.UrlShortener::CODE_LENGTH.'}')
    ->middleware('throttle:120,1')
    ->name('short-links.redirect');
