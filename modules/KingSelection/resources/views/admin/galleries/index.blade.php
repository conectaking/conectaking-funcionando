<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KingSelection — Galerias</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">Galerias</h1>
          <p class="text-slate-300 mt-1">Kanban por status (MVP).</p>
        </div>
        <a href="/admin/galleries/create" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold">
          Nova galeria
        </a>
      </div>

      @php
        $cols = [
          'preparacao' => 'Preparação',
          'andamento' => 'Andamento',
          'revisao' => 'Revisão',
          'finalizado' => 'Finalizado'
        ];
      @endphp

      <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        @foreach($cols as $key => $label)
          <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div class="font-semibold text-slate-200">{{ $label }}</div>
            <div class="mt-3 space-y-3">
              @foreach($galleries->where('status', $key) as $g)
                <a href="/admin/galleries/{{ $g->id }}" class="block rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-indigo-500">
                  <div class="font-semibold">{{ $g->nome_projeto }}</div>
                  <div class="text-xs text-slate-300 mt-1 font-mono">slug: {{ $g->slug }}</div>
                  <div class="text-xs text-slate-400 mt-1">cliente: {{ $g->cliente_email }}</div>
                </a>
              @endforeach
              @if($galleries->where('status', $key)->count() === 0)
                <div class="text-sm text-slate-500">Sem itens</div>
              @endif
            </div>
          </div>
        @endforeach
      </div>
    </div>
  </body>
</html>

