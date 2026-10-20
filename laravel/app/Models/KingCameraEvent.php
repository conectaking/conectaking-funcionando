<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KingCameraEvent extends Model
{
    use HasFactory;

    protected $table = 'king_camera_events';

    protected $fillable = [
        'camera_id',
        'user_id',
        'event_type',
        'description',
        'snapshot_path',
        'notified_telegram',
    ];

    protected $casts = [
        'notified_telegram' => 'boolean',
    ];

    public function camera(): BelongsTo
    {
        return $this->belongsTo(KingCamera::class, 'camera_id');
    }
}
