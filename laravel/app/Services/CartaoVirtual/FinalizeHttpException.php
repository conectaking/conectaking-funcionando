<?php

namespace App\Services\CartaoVirtual;

class FinalizeHttpException extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
