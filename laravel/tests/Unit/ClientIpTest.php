<?php

namespace Tests\Unit;

use App\Support\ClientIp;
use Illuminate\Http\Request;
use Tests\TestCase;

class ClientIpTest extends TestCase
{
    public function test_prefers_cf_connecting_ip(): void
    {
        $req = Request::create('/', 'GET', [], [], [], [
            'HTTP_CF_CONNECTING_IP' => '203.0.113.10',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.1',
            'REMOTE_ADDR' => '10.0.0.1',
        ]);

        $this->assertSame('203.0.113.10', ClientIp::from($req));
    }

    public function test_falls_back_to_x_forwarded_for(): void
    {
        $req = Request::create('/', 'GET', [], [], [], [
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7, 10.0.0.2',
            'REMOTE_ADDR' => '10.0.0.1',
        ]);

        $this->assertSame('198.51.100.7', ClientIp::from($req));
    }

    public function test_ignores_invalid_header(): void
    {
        $req = Request::create('/', 'GET', [], [], [], [
            'HTTP_CF_CONNECTING_IP' => 'not-an-ip',
            'REMOTE_ADDR' => '127.0.0.1',
        ]);

        $this->assertSame('127.0.0.1', ClientIp::from($req));
    }
}
