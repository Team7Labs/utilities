<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Rate limit counters (CACHE_STORE=database).
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('short_links', function (Blueprint $table) {
            // HMAC-SHA256 of the short code, keyed with APP_KEY. The code itself is never stored.
            $table->char('code_index', 64)->primary();
            // Laravel-encrypted destination URL.
            $table->text('original_url');
            // Links expire LIFETIME_HOURS after this, and expired ones are pruned by age.
            $table->timestamp('created_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('short_links');
        Schema::dropIfExists('cache');
    }
};
