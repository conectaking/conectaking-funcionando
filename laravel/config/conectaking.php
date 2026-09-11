<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Financeiro em standby
    |--------------------------------------------------------------------------
    | Quando true: oculta Gestão Financeira no menu e redireciona /zerar-mes
    | para /dashboard. APIs e código permanecem no repo para religar depois.
    */
    'finance_standby' => filter_var(env('FINANCE_MODULE_STANDBY', false), FILTER_VALIDATE_BOOLEAN),
];
