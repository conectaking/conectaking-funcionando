<?php

namespace App\Services\Leads;

use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Email;

/**
 * Pedido de reunião empresarial (routes/inquiry.js): envia e-mail de lead via SMTP.
 * Usa as mesmas variáveis EMAIL_* já configuradas para o Node.
 */
class InquiryService
{
    private const FROM_ADDRESS = 'conectaking@gmail.com';

    private const FROM_NAME = 'Notificação Conecta King';

    /**
     * @param  array<string,mixed>  $data
     */
    public function submit(array $data): void
    {
        $nome = $this->str($data['nome'] ?? null);
        $email = $this->str($data['email'] ?? null);
        $empresa = $this->str($data['empresa'] ?? null);
        $cargo = $this->str($data['cargo'] ?? null);
        $colaboradores = $this->str($data['colaboradores'] ?? null);
        $objetivo = $this->str($data['objetivo'] ?? null);

        $html = '<h1>👑 Novo Lead Empresarial para Conecta King!</h1>'
            .'<p>Uma nova empresa demonstrou interesse em uma demonstração. Aqui estão os detalhes:</p>'
            .'<ul>'
            .'<li><strong>Nome do Contato:</strong> '.e($nome).'</li>'
            .'<li><strong>E-mail:</strong> '.e($email).'</li>'
            .'<li><strong>Empresa:</strong> '.e($empresa).'</li>'
            .'<li><strong>Cargo:</strong> '.e($cargo).'</li>'
            .'<li><strong>Número de Colaboradores:</strong> '.e($colaboradores).'</li>'
            .'<li><strong>Principal Objetivo:</strong> '.e($objetivo !== '' ? $objetivo : 'Não informado').'</li>'
            .'</ul>'
            .'<p><strong>Ação recomendada:</strong> Entre em contato o mais rápido possível!</p>';

        $to = $this->env('EMAIL_TO_NOTIFY', 'SMTP_USER');
        if ($to === '') {
            throw new \RuntimeException('EMAIL_TO_NOTIFY não configurado.');
        }

        $message = (new Email)
            ->from(sprintf('"%s" <%s>', self::FROM_NAME, self::FROM_ADDRESS))
            ->to($to)
            ->subject("Novo Pedido de Reunião - {$empresa}")
            ->html($html);

        $this->mailer()->send($message);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<int,string>
     */
    public function missingRequiredFields(array $data): array
    {
        $missing = [];
        foreach (['nome', 'email', 'empresa', 'cargo', 'colaboradores'] as $field) {
            if ($this->str($data[$field] ?? null) === '') {
                $missing[] = $field;
            }
        }

        return $missing;
    }

    private function mailer(): Mailer
    {
        $host = $this->env('EMAIL_HOST', 'SMTP_HOST');
        if ($host === '') {
            throw new \RuntimeException('SMTP não configurado (EMAIL_HOST/SMTP_HOST).');
        }
        $port = (int) ($this->env('EMAIL_PORT', 'SMTP_PORT') ?: 587);
        $transport = new EsmtpTransport($host, $port, $port === 465);

        $user = $this->env('EMAIL_USER', 'SMTP_USER');
        if ($user !== '') {
            $transport->setUsername($user);
            $transport->setPassword($this->env('EMAIL_PASS', 'SMTP_PASS'));
        }

        return new Mailer($transport);
    }

    /**
     * Aceita as variáveis do Node (EMAIL_*) e cai para as do Laravel (SMTP_*).
     */
    private function env(string $key, string $fallbackKey): string
    {
        $value = trim((string) (env($key) ?: ''));

        return $value !== '' ? $value : trim((string) (env($fallbackKey) ?: ''));
    }

    private function str(mixed $v): string
    {
        return is_scalar($v) ? trim((string) $v) : '';
    }
}
