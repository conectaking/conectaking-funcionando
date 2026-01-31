<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KingSelection — {{ $gallery->nome_projeto }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="flex items-start justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold">{{ $gallery->nome_projeto }}</h1>
          <div class="mt-2 text-sm text-slate-300">
            <span class="font-mono">slug:</span> <span class="font-mono text-slate-200">{{ $gallery->slug }}</span>
          </div>
          <div class="mt-1 text-sm text-slate-400">cliente: {{ $gallery->cliente_email }}</div>
          <div class="mt-4 flex flex-wrap gap-2">
            <a class="px-4 py-2 rounded-lg bg-slate-200 text-slate-900 font-semibold hover:bg-white" href="/admin/galleries">Voltar</a>
            <a class="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400" href="/g/{{ $gallery->slug }}" target="_blank">Abrir como cliente</a>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 w-full max-w-sm">
          <div class="font-semibold">Status</div>
          <form method="POST" action="/admin/galleries/{{ $gallery->id }}/status" class="mt-3 flex gap-2">
            @csrf
            <select name="status" class="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2">
              @foreach(['preparacao'=>'Preparação','andamento'=>'Andamento','revisao'=>'Revisão','finalizado'=>'Finalizado'] as $k=>$l)
                <option value="{{ $k }}" @if($gallery->status===$k) selected @endif>{{ $l }}</option>
              @endforeach
            </select>
            <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold">Salvar</button>
          </form>
          <div class="mt-4 text-xs text-slate-400">
            Link do cliente:
            <div class="mt-1 font-mono text-slate-200 break-all">{{ url('/g/'.$gallery->slug) }}</div>
          </div>
        </div>
      </div>

      <div class="mt-10">
        <h2 class="text-lg font-semibold">Fotos ({{ $gallery->photos->count() }})</h2>
        <p class="text-slate-400 text-sm mt-1">Neste MVP, as fotos são cadastradas no banco e servidas via preview com watermark.</p>

        @if($gallery->photos->count() === 0)
          <div class="mt-4 text-slate-500">Nenhuma foto cadastrada ainda.</div>
        @else
          <div class="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            @foreach($gallery->photos as $p)
              <div class="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <img class="w-full h-36 object-cover" loading="lazy" src="/media/photo/{{ $p->id }}/preview" alt="{{ $p->original_name }}" />
                <div class="p-2 text-xs text-slate-300 font-mono truncate">{{ $p->original_name }}</div>
              </div>
            @endforeach
          </div>
        @endif
      </div>
    </div>
  </body>
</html>

