<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class KingCamera extends Model
{
    use HasFactory;

    protected $table = 'king_cameras';

    protected $fillable = [
        'user_id',
        'name',
        'room',
        'brand',
        'ip_address',
        'rtsp_port',
        'port',
        'onvif_port',
        'stream_path',
        'rtsp_path',
        'username',
        'password',
        'stream_id',
        'status',
        'telegram_chat_id',
        'telegram_alerts_enabled',
        'motion_detection_enabled',
        'audio_detection_enabled',
        'roi_zones_json',
        'last_event_at',
        'last_snapshot_url',
    ];

    protected $casts = [
        'rtsp_port' => 'integer',
        'onvif_port' => 'integer',
        'telegram_alerts_enabled' => 'boolean',
        'motion_detection_enabled' => 'boolean',
        'audio_detection_enabled' => 'boolean',
        'roi_zones_json' => 'array',
        'last_event_at' => 'datetime',
    ];

    public function getPortAttribute(): int
    {
        return (int) ($this->attributes['rtsp_port'] ?? 554);
    }

    public function setPortAttribute($value): void
    {
        $this->attributes['rtsp_port'] = (int) ($value ?: 554);
    }

    public function getRtspPathAttribute(): string
    {
        return (string) ($this->attributes['stream_path'] ?? '/onvif1');
    }

    public function setRtspPathAttribute($value): void
    {
        $this->attributes['stream_path'] = '/' . ltrim((string) ($value ?: 'onvif1'), '/');
    }

    public function setPasswordAttribute(?string $value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['password'] = '';
            return;
        }

        try {
            // Se já estiver criptografado, não recriptografa
            Crypt::decryptString($value);
            $this->attributes['password'] = $value;
        } catch (\Throwable) {
            $this->attributes['password'] = Crypt::encryptString($value);
        }
    }

    public function getDecryptedPassword(): string
    {
        $raw = (string) ($this->attributes['password'] ?? '');
        if ($raw === '') {
            return '';
        }

        try {
            return Crypt::decryptString($raw);
        } catch (\Throwable) {
            return $raw;
        }
    }

    public function getFullRtspUrlAttribute(): string
    {
        $user = urlencode((string) ($this->username ?: 'admin'));
        $pass = urlencode($this->getDecryptedPassword());
        $auth = ($user !== '' || $pass !== '') ? "{$user}:{$pass}@" : '';
        $port = (int) ($this->rtsp_port ?: 554);
        $path = '/' . ltrim((string) ($this->stream_path ?: '/onvif1'), '/');

        return "rtsp://{$auth}{$this->ip_address}:{$port}{$path}";
    }

    public function events(): HasMany
    {
        return $this->hasMany(KingCameraEvent::class, 'camera_id')->orderByDesc('id');
    }
}
