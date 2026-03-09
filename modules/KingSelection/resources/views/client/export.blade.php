<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ $gallery->nome_projeto }} — Exportar</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-slate-900">
    <div class="max-w-3xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold">Exportação</h1>
          <p class="text-slate-600 mt-1">{{ $gallery->nome_projeto }}</p>
        </div>
        <a href="/g/{{ $gallery->slug }}/gallery" class="text-slate-600 hover:text-slate-900 font-semibold">Voltar</a>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-4">
        <div class="rounded-2xl border border-slate-200 p-5">
          <div class="font-bold">Lightroom</div>
          <p class="text-sm text-slate-600 mt-1">Copia nomes separados por vírgula.</p>
          <textarea id="lr" class="mt-3 w-full min-h-[120px] rounded-xl border border-slate-200 p-3 font-mono text-sm">{{ $lightroom }}</textarea>
          <button onclick="copy('lr')" class="mt-3 px-4 py-2 rounded-lg bg-indigo-700 text-white font-bold hover:bg-indigo-800">Copiar</button>
        </div>

        <div class="rounded-2xl border border-slate-200 p-5">
          <div class="font-bold">Windows</div>
          <p class="text-sm text-slate-600 mt-1">Copia com operador OR.</p>
          <textarea id="win" class="mt-3 w-full min-h-[120px] rounded-xl border border-slate-200 p-3 font-mono text-sm">{{ $windows }}</textarea>
          <button onclick="copy('win')" class="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-black">Copiar</button>
        </div>
      </div>

      <div class="mt-8 rounded-2xl border border-slate-200 p-5">
        <div class="font-bold">Finalizar seleção</div>
        <p class="text-sm text-slate-600 mt-1">Deixe um comentário para o fotógrafo (opcional).</p>
        <form method="POST" action="/g/{{ $gallery->slug }}/finalize" class="mt-3">
          @csrf
          <textarea name="feedback" class="w-full min-h-[120px] rounded-xl border border-slate-200 p-3" placeholder="Digite seu comentário..."></textarea>
          <button class="mt-3 w-full px-4 py-3 rounded-xl bg-emerald-500 text-slate-900 font-extrabold hover:bg-emerald-400">
            ENVIAR SELEÇÃO
          </button>
        </form>
      </div>
    </div>

    <script>
      async function copy(id) {
        const el = document.getElementById(id);
        el.select();
        el.setSelectionRange(0, 999999);
        try {
          await navigator.clipboard.writeText(el.value || '');
        } catch (e) {
          document.execCommand('copy');
        }
        alert('Copiado!');
      }
    </script>
  </body>
</html>

