<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class VcardService
{
    /**
     * @return array{vCard:string,fullName:string}|null
     */
    public function build(string $identifier): ?array
    {
        $user = DB::selectOne(
            'SELECT id FROM users WHERE profile_slug = ? OR id::text = ? LIMIT 1',
            [$identifier, $identifier]
        );
        if (!$user) {
            return null;
        }

        $profile = DB::selectOne(
            'SELECT display_name, whatsapp FROM user_profiles WHERE user_id = ? LIMIT 1',
            [$user->id]
        );
        if (!$profile) {
            return null;
        }

        $items = DB::select(
            'SELECT item_type, title, destination_url, pix_key
             FROM profile_items
             WHERE user_id = ? AND is_active = TRUE
             ORDER BY display_order ASC',
            [$user->id]
        );

        return $this->compose($identifier, (array) $profile, array_map(static fn ($i) => (array) $i, $items));
    }

    /**
     * @param  array<string, mixed>  $profile
     * @param  list<array<string, mixed>>  $items
     * @return array{vCard:string,fullName:string}
     */
    private function compose(string $identifier, array $profile, array $items): array
    {
        $fullName = trim((string) ($profile['display_name'] ?? '')) ?: 'Contato Conecta King';
        $lines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'FN:'.$fullName,
            'URL;TYPE=WORK:https://tag.conectaking.com.br/'.$identifier,
        ];

        $notes = ['Contato salvo via Conecta King.'];
        $emailAdded = false;
        $phoneAdded = false;

        $whatsapp = trim((string) ($profile['whatsapp'] ?? ''));
        if ($whatsapp !== '' && !$phoneAdded) {
            $digits = preg_replace('/\D+/', '', $whatsapp) ?? '';
            if ($digits !== '') {
                $lines[] = 'TEL;TYPE=CELL,VOICE:'.$digits;
                $lines[] = 'URL;TYPE=WhatsApp:https://wa.me/'.$digits;
                $phoneAdded = true;
            }
        }

        foreach ($items as $item) {
            $url = trim((string) ($item['destination_url'] ?? ''));
            if ($url === '') {
                continue;
            }
            $type = (string) ($item['item_type'] ?? 'link');
            $itemTitle = (string) ($item['title'] ?? $type);

            switch ($type) {
                case 'whatsapp':
                    if (!$phoneAdded) {
                        $phone = preg_replace('/\D+/', '', $url) ?? '';
                        if ($phone !== '') {
                            $lines[] = 'TEL;TYPE=CELL,VOICE:'.$phone;
                            $phoneAdded = true;
                        }
                    }
                    $lines[] = str_starts_with($url, 'http')
                        ? 'URL;TYPE=WhatsApp:'.$url
                        : 'URL;TYPE=WhatsApp:https://wa.me/'.(preg_replace('/\D+/', '', $url) ?? '');
                    break;
                case 'email':
                    $email = preg_replace('/^mailto:/i', '', $url) ?? $url;
                    $email = trim($email);
                    if (!str_contains($email, '@')) {
                        $email = $url;
                    }
                    if (str_contains($email, '@')) {
                        if (!$emailAdded) {
                            $lines[] = 'EMAIL;TYPE=INTERNET:'.$email;
                            $emailAdded = true;
                        } else {
                            $lines[] = 'URL;TYPE=Email:mailto:'.$email;
                        }
                    }
                    break;
                case 'telegram':
                    if (!$phoneAdded) {
                        $phone = preg_replace('/\D+/', '', $url) ?? '';
                        if (strlen($phone) >= 10) {
                            $lines[] = 'TEL;TYPE=CELL,VOICE:'.$phone;
                            $phoneAdded = true;
                        }
                    }
                    $lines[] = str_starts_with($url, 'http')
                        ? 'URL;TYPE=Telegram:'.$url
                        : 'URL;TYPE=Telegram:https://t.me/'.ltrim($url, '@');
                    break;
                case 'instagram':
                    $lines[] = str_starts_with($url, 'http')
                        ? 'URL;TYPE=Instagram:'.$url
                        : 'URL;TYPE=Instagram:https://instagram.com/'.ltrim($url, '@');
                    break;
                case 'facebook':
                    $lines[] = 'URL;TYPE=Facebook:'.(str_starts_with($url, 'http') ? $url : 'https://facebook.com/'.$url);
                    break;
                case 'twitter':
                    $lines[] = 'URL;TYPE=Twitter:'.(str_starts_with($url, 'http') ? $url : 'https://twitter.com/'.ltrim($url, '@'));
                    break;
                case 'linkedin':
                    $lines[] = 'URL;TYPE=LinkedIn:'.(str_starts_with($url, 'http') ? $url : 'https://linkedin.com/in/'.$url);
                    break;
                case 'youtube':
                    $lines[] = 'URL;TYPE=YouTube:'.(str_starts_with($url, 'http') ? $url : 'https://youtube.com/'.$url);
                    break;
                case 'spotify':
                    $lines[] = 'URL;TYPE=Spotify:'.(str_starts_with($url, 'http') ? $url : 'https://open.spotify.com/'.$url);
                    break;
                case 'pinterest':
                    $lines[] = 'URL;TYPE=Pinterest:'.(str_starts_with($url, 'http') ? $url : 'https://pinterest.com/'.$url);
                    break;
                case 'tiktok':
                    $lines[] = 'URL;TYPE=TikTok:'.(str_starts_with($url, 'http') ? $url : 'https://tiktok.com/@'.ltrim($url, '@'));
                    break;
                case 'portfolio':
                case 'link':
                    $normalized = str_starts_with($url, 'http') ? $url : 'https://'.$url;
                    $label = $this->capitalize($itemTitle) ?: 'Link';
                    $lines[] = 'URL;TYPE='.$label.':'.$normalized;
                    break;
                case 'pix':
                case 'pix_qrcode':
                    if (!empty($item['pix_key'])) {
                        $notes[] = 'Chave PIX: '.$item['pix_key'];
                    }
                    if (str_starts_with($url, 'http')) {
                        $lines[] = 'URL;TYPE=PIX:'.$url;
                    }
                    break;
                case 'wifi':
                    try {
                        if (str_starts_with($url, '{')) {
                            $w = json_decode($url, true);
                            $ssid = trim((string) ($w['ssid'] ?? ''));
                            if ($ssid !== '') {
                                $notes[] = 'Wi-Fi SSID: '.$ssid;
                            }
                        }
                    } catch (\Throwable $e) {
                        // ignore
                    }
                    break;
                default:
                    $defaultUrl = str_starts_with($url, 'http') ? $url : 'https://'.$url;
                    $label = $this->capitalize($itemTitle) ?: ($this->capitalize($type) ?: 'Link');
                    $lines[] = 'URL;TYPE='.$label.':'.$defaultUrl;
                    break;
            }
        }

        if ($notes !== []) {
            $lines[] = 'NOTE:'.implode('\\n', $notes);
        }
        $lines[] = 'END:VCARD';

        return [
            'vCard' => implode("\n", $lines)."\n",
            'fullName' => $fullName,
        ];
    }

    private function capitalize(string $s): string
    {
        if ($s === '') {
            return '';
        }

        return mb_strtoupper(mb_substr($s, 0, 1)).mb_substr($s, 1);
    }
}
