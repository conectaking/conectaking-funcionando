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
        'telegram_phone',
        'telegram_alerts_enabled',
        'motion_detection_enabled',
        'audio_detection_enabled',
        'crib_fence_enabled',
        'crib_roi_json',
        'baby_stand_enabled',
        'baby_cry_enabled',
        'auto_tracking_enabled',
        'device_id',
        'mac_address',
        'roi_zones_json',
        'last_event_at',
        'last_snapshot_url',
    ];

    protected $appends = ['display_ip'];

    protected $casts = [
        'rtsp_port' => 'integer',
        'onvif_port' => 'integer',
        'telegram_alerts_enabled' => 'boolean',
        'motion_detection_enabled' => 'boolean',
        'audio_detection_enabled' => 'boolean',
        'crib_fence_enabled' => 'boolean',
        'crib_roi_json' => 'array',
        'baby_stand_enabled' => 'boolean',
        'baby_cry_enabled' => 'boolean',
        'auto_tracking_enabled' => 'boolean',
        'roi_zones_json' => 'array',
        'last_event_at' => 'datetime',
    ];

    public function getDisplayIpAttribute(): string
    {
        $ip = (string) ($this->attributes['ip_address'] ?? '');
        $port = (int) ($this->attributes['rtsp_port'] ?? 554);
        $name = strtolower($this->attributes['name'] ?? '');
        if ($ip === '172.18.0.1' || $ip === '127.0.0.1' || $ip === 'localhost') {
            if ($port === 1554 || str_contains($name, 'bebe') || str_contains($name, 'bebê')) {
                return '172.16.100.215';
            }
            if ($port === 1555 || str_contains($name, 'sala')) {
                return '172.16.100.43';
            }
        }
        return $ip;
    }

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
        $pass = str_replace('%2A', '*', urlencode($this->getDecryptedPassword()));
        $auth = ($user !== '' || $pass !== '') ? "{$user}:{$pass}@" : '';
        $port = (int) ($this->rtsp_port ?: 554);
        $path = '/' . ltrim((string) ($this->stream_path ?: '/onvif1'), '/');

        return "rtsp://{$auth}{$this->ip_address}:{$port}{$path}";
    }

    public function events(): HasMany
    {
        return $this->hasMany(KingCameraEvent::class, 'camera_id')->orderByDesc('id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(KingCameraShare::class, 'camera_id')->orderByDesc('id');
    }
}
