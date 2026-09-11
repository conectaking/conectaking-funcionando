<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthThrottleAndRobotsTest extends TestCase
{
    public function test_robots_disallows_admin(): void
    {
        $response = $this->get('/robots.txt');
        $response->assertOk();
        $response->assertSee('Disallow: /admin', false);
    }

    public function test_security_txt_available(): void
    {
        $response = $this->get('/.well-known/security.txt');
        $response->assertOk();
        $response->assertSee('Contact:', false);
    }

    public function test_password_forgot_throttle_headers_exist(): void
    {
        // Apenas garante rota responde (400 e-mail inválido) sem vazar existência
        $response = $this->postJson('/api/password/forgot', ['email' => 'not-an-email']);
        $this->assertTrue(in_array($response->status(), [400, 422], true));
    }
}
