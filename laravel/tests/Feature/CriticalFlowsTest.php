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

    public function test_finance_standby_redirects_zerar_mes(): void
    {
        config(['conectaking.finance_standby' => true]);

        $this->get('/zerar-mes')->assertRedirect('/dashboard');
        $this->get('/zerar-mes.html')->assertRedirect('/dashboard');
    }

    public function test_robots_and_manifest_available(): void
    {
        $this->get('/robots.txt')->assertOk();
        $this->get('/manifest.json')->assertOk();
    }
}
