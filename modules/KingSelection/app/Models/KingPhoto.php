<?php

namespace KingSelection\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KingPhoto extends Model
{
    protected $table = 'king_photos';

    public $timestamps = false;

    protected $fillable = [
        'gallery_id',
        'file_path',
        'original_name',
        'order'
    ];

    public function gallery(): BelongsTo
    {
        return $this->belongsTo(KingGallery::class, 'gallery_id');
    }
}

