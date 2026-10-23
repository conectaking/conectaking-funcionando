<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CharleneMemory extends Model
{
    protected $table = 'charlene_memories';

    protected $fillable = [
        'category',
        'subject',
        'content',
        'learned_from',
        'last_mentioned_at',
    ];

    protected $casts = [
        'last_mentioned_at' => 'datetime',
    ];
}
