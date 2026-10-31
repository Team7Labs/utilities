<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

/**
 * A one-time link: deleted on its first visit, or after LIFETIME_HOURS if never visited.
 */
class ShortLink extends Model
{
    use Prunable;

    public const LIFETIME_HOURS = 24;

    public const UPDATED_AT = null;

    protected $primaryKey = 'code_index';

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'code_index',
        'original_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'code_index',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'original_url' => 'encrypted',
        ];
    }

    /**
     * Links that are still within their lifetime.
     *
     * @param  Builder<ShortLink>  $query
     * @return Builder<ShortLink>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('created_at', '>', now()->subHours(self::LIFETIME_HOURS));
    }

    /**
     * Links that have outlived their lifetime.
     *
     * @param  Builder<ShortLink>  $query
     * @return Builder<ShortLink>
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('created_at', '<=', now()->subHours(self::LIFETIME_HOURS));
    }

    /**
     * Unvisited links are removed by `model:prune` once they expire.
     *
     * @return Builder<ShortLink>
     */
    public function prunable(): Builder
    {
        return static::expired();
    }
}
