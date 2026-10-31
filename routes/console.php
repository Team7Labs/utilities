<?php

use App\Models\ShortLink;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Delete short links that were never visited once they pass their 24-hour lifetime.
Schedule::command('model:prune', ['--model' => [ShortLink::class]])->everyFiveMinutes();
