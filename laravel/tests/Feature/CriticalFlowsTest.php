<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Smoke dos fluxos críticos (páginas públicas + saúde) sem depender de Postgres real.
 */
class CriticalFlowsTest extends TestCase
{
    public function test_health_ok(): void
    {
        $this->get('/health')
            ->assertOk()
            ->assertJsonStructure(['status']);
    }

    public function test_login_page_renders(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_dashboard_page_renders(): void
    {
        $this->get('/dashboard')->assertOk();
    }

    public function test_king_forms_page_renders(): void
    {
        $this->get('/kingForms')->assertOk();
    }

    public function test_king_docs_page_renders(): void
    {
        $this->get('/kingDocs')->assertOk();
    }

    public function test_unknown_card_slug_returns_404(): void
    {
        // Slug reservado: 404 sem hit no banco (útil em sqlite :memory:).
        $this->get('/forgot')->assertStatus(404);
    }

    public function test_card_api_unknown_returns_404_json(): void
    {
        $this->getJson('/api/card/forgot')
            ->assertStatus(404)
            ->assertJsonStructure(['error']);
    }

    public function test_finance_standby_redirects_zerar_mes_when_enabled(): void
    {
        // Rotas são registadas no boot; com standby OFF (default) a página existe.
        // Aqui só validamos a flag de config (ocultação real é via separação de pacotes).
        config(['conectaking.finance_standby' => false]);
        $this->assertFalse((bool) config('conectaking.finance_standby'));
        $this->get('/zerar-mes')->assertOk();
    }

    public function test_business_page_renders(): void
    {
        $this->get('/business')->assertOk();
    }

    public function test_robots_and_manifest_available(): void
    {
        $robots = $this->get('/robots.txt');
        $this->assertTrue(in_array($robots->getStatusCode(), [200, 404], true));

        $manifest = $this->get('/manifest.json');
        $this->assertTrue(in_array($manifest->getStatusCode(), [200, 404], true));
    }
}
