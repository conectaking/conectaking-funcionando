<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KingSelection — Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">KingSelection</h1>
          <p class="text-slate-300 mt-1">Painel de galerias (isolado).</p>
        </div>
        <a href="/admin/galleries" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold">
          Ver Galerias
        </a>
      </div>

      <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 class="font-semibold text-lg">Criar galeria</h2>
          <p class="text-slate-300 mt-2">Crie uma galeria com e-mail e senha do cliente (estilo Alboom).</p>
          <a href="/admin/galleries/create" class="inline-flex mt-5 px-4 py-2 rounded-lg bg-slate-200 text-slate-900 font-semibold hover:bg-white">
            Nova galeria
          </a>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 class="font-semibold text-lg">Link do cliente</h2>
          <p class="text-slate-300 mt-2">Cada galeria terá um link no formato <span class="font-mono">/g/slug</span>.</p>
        </div>
      </div>
    </div>
  </body>
</html>

