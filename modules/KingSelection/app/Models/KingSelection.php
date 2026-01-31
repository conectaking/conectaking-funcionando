<?php

namespace KingSelection\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KingSelection extends Model
{
    protected $table = 'king_selections';

    public $timestamps = false;

    protected $fillable = [
        'gallery_id',
        'photo_id',
        'feedback_cliente'
    ];

    public function gallery(): BelongsTo
    {
        return $this->belongsTo(KingGallery::class, 'gallery_id');
    }

    public function photo(): BelongsTo
    {
        return $this->belongsTo(KingPhoto::class, 'photo_id');
    }
}

