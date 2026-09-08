<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Services\Finance\FinanceService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(private readonly FinanceService $finance)
    {
    }

    public function profiles(Request $request)
    {
        $r = $this->finance->profiles((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function primaryProfile(Request $request)
    {
        $r = $this->finance->primaryProfile((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createProfile(Request $request)
    {
        $r = $this->finance->createProfile((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateProfile(Request $request, string $id)
    {
        $r = $this->finance->updateProfile((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteProfile(Request $request, string $id)
    {
        $r = $this->finance->deleteProfile((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function profilesLimit(Request $request)
    {
        $r = $this->finance->profilesLimit((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function incomeBreakdown(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->incomeBreakdown(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null,
            (string) ($request->query('scope') ?: 'monthly')
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function dashboard(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->dashboard(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function cards(Request $request)
    {
        $r = $this->finance->cards((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createCard(Request $request)
    {
        $r = $this->finance->createCard((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateCard(Request $request, string $id)
    {
        $r = $this->finance->updateCard((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteCard(Request $request, string $id)
    {
        $r = $this->finance->deleteCard((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function transactions(Request $request)
    {
        $r = $this->finance->transactions((string) $request->attributes->get('auth_user_id'), $request->query());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function transactionById(Request $request, string $id)
    {
        $r = $this->finance->transactionById((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createTransaction(Request $request)
    {
        $r = $this->finance->createTransaction((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateTransaction(Request $request, string $id)
    {
        $r = $this->finance->updateTransaction((string) $request->attributes->get('auth_user_id'), (int) $id, $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteTransaction(Request $request, string $id)
    {
        $r = $this->finance->deleteTransaction((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function categories(Request $request)
    {
        $type = $request->query('type');
        $r = $this->finance->categories(
            (string) $request->attributes->get('auth_user_id'),
            $type ? (string) $type : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createCategory(Request $request)
    {
        $r = $this->finance->createCategory((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function accounts(Request $request)
    {
        $r = $this->finance->accounts((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createAccount(Request $request)
    {
        $r = $this->finance->createAccount((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function goals(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->goals(
            (string) $request->attributes->get('auth_user_id'),
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createGoal(Request $request)
    {
        $r = $this->finance->createGoal((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteGoal(Request $request, string $id)
    {
        $r = $this->finance->deleteGoal((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function kingData(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->kingData(
            (string) $request->attributes->get('auth_user_id'),
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function saveKingData(Request $request)
    {
        $r = $this->finance->saveKingData((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function upgradePlans(Request $request)
    {
        $r = $this->finance->upgradePlans((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function whatsappConfig(Request $request)
    {
        $r = $this->finance->whatsappConfig((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function updateWhatsappConfig(Request $request)
    {
        $r = $this->finance->updateWhatsappConfig((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarSenhaStatus(Request $request)
    {
        $r = $this->finance->zerarSenhaStatus((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarSenhaVerify(Request $request)
    {
        $r = $this->finance->zerarSenhaVerify((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function putZerarSenha(Request $request)
    {
        $r = $this->finance->putZerarSenha((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function zerarMes(Request $request)
    {
        $r = $this->finance->zerarMes((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function adminClientesSenhas(Request $request)
    {
        $r = $this->finance->adminClientesSenhas((string) $request->attributes->get('auth_user_id'));

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function profileById(Request $request, string $id)
    {
        $r = $this->finance->profileById((string) $request->attributes->get('auth_user_id'), (int) $id);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function budgets(Request $request)
    {
        $month = $request->query('month');
        $year = $request->query('year');
        $r = $this->finance->budgets(
            (string) $request->attributes->get('auth_user_id'),
            ($month !== null && $month !== '') ? (int) $month : null,
            ($year !== null && $year !== '') ? (int) $year : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function createBudget(Request $request)
    {
        $r = $this->finance->createBudget((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function reportSummary(Request $request)
    {
        $pid = $request->query('profile_id');
        $r = $this->finance->reportSummary(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            ($pid !== null && $pid !== '' && $pid !== 'undefined') ? (int) $pid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function reportCategories(Request $request)
    {
        $r = $this->finance->reportCategories(
            (string) $request->attributes->get('auth_user_id'),
            $request->query('dateFrom') ? (string) $request->query('dateFrom') : null,
            $request->query('dateTo') ? (string) $request->query('dateTo') : null,
            $request->query('type') ? (string) $request->query('type') : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function transfer(Request $request)
    {
        $r = $this->finance->transfer((string) $request->attributes->get('auth_user_id'), $request->all());

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function uploadAttachment(Request $request)
    {
        $file = $request->file('file');
        $url = null;
        if ($file) {
            $name = 'finance_'.time().'_'.preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
            $destDir = public_path('uploads/finance');
            if (! is_dir($destDir)) {
                @mkdir($destDir, 0775, true);
            }
            $file->move($destDir, $name);
            $url = '/uploads/finance/'.$name;
        }
        $r = $this->finance->uploadAttachment($url);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function serasaImportPreview(Request $request)
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json([
                'success' => false, 'data' => null, 'error' => 'Envie um arquivo PDF.', 'message' => 'Envie um arquivo PDF.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $tmp = sys_get_temp_dir().'/serasa-pdf-'.uniqid('', true).'.pdf';
        try {
            file_put_contents($tmp, file_get_contents($file->getRealPath() ?: $file->getPathname()));
            $r = $this->finance->serasaImportPreview($tmp);
        } finally {
            @unlink($tmp);
        }

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function serasaImportImagePreview(Request $request)
    {
        $files = $request->file('files') ?: [];
        if ($request->file('file')) {
            $files = array_merge(is_array($files) ? $files : [], [$request->file('file')]);
        }
        if (! is_array($files)) {
            $files = [$files];
        }
        $files = array_values(array_filter($files));
        if (! $files) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => 'Envie uma ou mais imagens (JPEG/PNG) da tela Detalhes da dívida.',
                'message' => 'Envie uma ou mais imagens (JPEG/PNG) da tela Detalhes da dívida.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $paths = [];
        try {
            foreach ($files as $f) {
                $ext = str_contains((string) $f->getMimeType(), 'png') ? '.png' : '.jpg';
                $p = sys_get_temp_dir().'/serasa-ocr-'.uniqid('', true).$ext;
                file_put_contents($p, file_get_contents($f->getRealPath() ?: $f->getPathname()));
                $paths[] = $p;
            }
            $r = $this->finance->serasaImportImagePreview($paths);
        } finally {
            foreach ($paths as $p) {
                @unlink($p);
            }
        }

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
