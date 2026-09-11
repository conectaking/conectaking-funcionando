<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_returns_minimal_json(): void
    {
        $response = $this->get('/health');
        $response->assertStatus(200);
        $response->assertJsonStructure(['status']);
        $this->assertContains($response->json('status'), ['ok', 'degraded']);
    }

    public function test_up_ok(): void
    {
        $this->get('/up')->assertOk();
    }
}
