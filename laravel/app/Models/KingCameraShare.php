<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KingCameraShare extends Model
{
    use HasFactory;

    protected $table = 'king_camera_shares';

    protected $fillable = [
        'camera_id',
        'user_id',
        'share_token',
        'label',
        'expires_at',
        'duration_seconds',
        'can_audio',
        'can_ptz',
        'view_count',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'can_audio' => 'boolean',
        'can_ptz' => 'boolean',
        'is_active' => 'boolean',
        'duration_seconds' => 'integer',
        'view_count' => 'integer',
    ];

    public function camera(): BelongsTo
    {
        return $this->belongsTo(KingCamera::class, 'camera_id');
    }

    public function isExpired(): bool
    {
        if (! $this->is_active) {
            return true;
        }

        return $this->expires_at->isPast();
    }
}
