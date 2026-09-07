<?php

namespace App\Services\CartaoVirtual;

/**
 * Gera payload PIX estático (BR Code / EMV) compatível com qrcode-pix (Node).
 */
class PixBrCodeService
{
    public function payload(string $key, string $name = 'Recebedor', string $city = 'CIDADE'): string
    {
        $key = trim($key);
        $name = $this->sanitize($name !== '' ? $name : 'Recebedor', 25);
        $city = $this->sanitize($city !== '' ? $city : 'CIDADE', 15);

        $merchantAccount = $this->tlv('00', 'BR.GOV.BCB.PIX')
            .$this->tlv('01', $key);

        $additional = $this->tlv('05', '***');

        $payload = $this->tlv('00', '01')
            .$this->tlv('26', $merchantAccount)
            .$this->tlv('52', '0000')
            .$this->tlv('53', '986')
            .$this->tlv('58', 'BR')
            .$this->tlv('59', $name)
            .$this->tlv('60', $city)
            .$this->tlv('62', $additional)
            .'6304';

        return $payload.$this->crc16($payload);
    }

    private function tlv(string $id, string $value): string
    {
        $len = strlen($value);
        if ($len > 99) {
            $value = substr($value, 0, 99);
            $len = 99;
        }

        return $id.str_pad((string) $len, 2, '0', STR_PAD_LEFT).$value;
    }

    private function sanitize(string $value, int $max): string
    {
        // qrcode-pix remove acentos e limita tamanho
        $map = [
            'Á'=>'A','À'=>'A','Ã'=>'A','Â'=>'A','Ä'=>'A',
            'É'=>'E','È'=>'E','Ê'=>'E','Ë'=>'E',
            'Í'=>'I','Ì'=>'I','Î'=>'I','Ï'=>'I',
            'Ó'=>'O','Ò'=>'O','Õ'=>'O','Ô'=>'O','Ö'=>'O',
            'Ú'=>'U','Ù'=>'U','Û'=>'U','Ü'=>'U',
            'Ç'=>'C','Ñ'=>'N',
            'á'=>'a','à'=>'a','ã'=>'a','â'=>'a','ä'=>'a',
            'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
            'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i',
            'ó'=>'o','ò'=>'o','õ'=>'o','ô'=>'o','ö'=>'o',
            'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u',
            'ç'=>'c','ñ'=>'n',
        ];
        $value = strtr($value, $map);
        $value = preg_replace('/[^A-Za-z0-9 $%*+\-.\/:]/', '', $value) ?? '';
        $value = trim($value);
        if ($value === '') {
            $value = 'RECEBEDOR';
        }

        return substr($value, 0, $max);
    }

    private function crc16(string $payload): string
    {
        $polinomio = 0x1021;
        $resultado = 0xFFFF;
        $length = strlen($payload);
        for ($offset = 0; $offset < $length; $offset++) {
            $resultado ^= (ord($payload[$offset]) << 8);
            for ($bitwise = 0; $bitwise < 8; $bitwise++) {
                $resultado <<= 1;
                if ($resultado & 0x10000) {
                    $resultado ^= $polinomio;
                }
                $resultado &= 0xFFFF;
            }
        }

        return strtoupper(str_pad(dechex($resultado), 4, '0', STR_PAD_LEFT));
    }
}
