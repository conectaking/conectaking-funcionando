<?php

namespace KingSelection\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KingGallery extends Model
{
    protected $table = 'king_galleries';

    protected $fillable = [
        'profile_item_id',
        'nome_projeto',
        'slug',
        'cliente_email',
        'senha_hash',
        'status',
        'total_fotos_contratadas',
        'watermark_path'
    ];

    public function photos(): HasMany
    {
        return $this->hasMany(KingPhoto::class, 'gallery_id');
    }

    public function selections(): HasMany
    {
        return $this->hasMany(KingSelection::class, 'gallery_id');
    }
}

