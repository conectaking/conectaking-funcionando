<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KingSelection — Nova galeria</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div class="max-w-xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Nova galeria</h1>
        <a href="/admin/galleries" class="text-slate-300 hover:text-white">Voltar</a>
      </div>

      @if($errors->any())
        <div class="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4">
          <div class="font-semibold text-red-200">Corrija os campos:</div>
          <ul class="mt-2 text-sm text-red-200 list-disc pl-5">
            @foreach($errors->all() as $e)
              <li>{{ $e }}</li>
            @endforeach
          </ul>
        </div>
      @endif

      <form method="POST" action="/admin/galleries" class="mt-6 space-y-4">
        @csrf
        <div>
          <label class="block text-sm font-semibold text-slate-200">Nome do projeto</label>
          <input name="nome_projeto" value="{{ old('nome_projeto') }}" class="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-200">E-mail do cliente</label>
          <input type="email" name="cliente_email" value="{{ old('cliente_email') }}" class="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-200">Senha do cliente</label>
          <input type="password" name="senha" class="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-200">Total de fotos contratadas</label>
          <input type="number" name="total_fotos_contratadas" value="{{ old('total_fotos_contratadas', 0) }}" class="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500" />
        </div>

        <button class="w-full mt-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold">
          Criar
        </button>
      </form>
    </div>
  </body>
</html>

