<?php

namespace Tests\Unit;

use App\Services\CartaoVirtual\KingSelectionPasswordCrypto;
use App\Support\KingSelection\KsAccess;
use Tests\TestCase;

class KsAccessTest extends TestCase
{
    public function test_norm_access_mode(): void
    {
        $this->assertSame('signup', KsAccess::normAccessMode('password'));
        $this->assertSame('public', KsAccess::normAccessMode('PUBLIC'));
        $this->assertSame('private', KsAccess::normAccessMode('weird'));
        $this->assertTrue(KsAccess::allowsSelfSignup('signup'));
        $this->assertTrue(KsAccess::allowsSelfSignup('paid_event_photos'));
        $this->assertFalse(KsAccess::allowsSelfSignup('private'));
    }

    public function test_name_and_phone_norm(): void
    {
        $this->assertSame('jose silva', KsAccess::normClientNameMatch('  José   Silva '));
        $this->assertSame('11999887766', KsAccess::normClientPhoneDigits('(11) 99988-7766'));
        $this->assertSame('finalizado', KsAccess::normStatus('Finalizado'));
    }

    public function test_password_crypto_roundtrip(): void
    {
        config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);
        putenv('JWT_SECRET=test-secret-ks-f1');
        $_ENV['JWT_SECRET'] = 'test-secret-ks-f1';

        $crypto = new KingSelectionPasswordCrypto;
        $enc = $crypto->encrypt('654321');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9+\/=]+\.[A-Za-z0-9+\/=]+\.[A-Za-z0-9+\/=]+$/', $enc);
        $this->assertSame('654321', $crypto->decrypt($enc));
    }
}
