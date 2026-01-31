<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ $gallery->nome_projeto }} — Seleção</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-slate-900">
    <div class="min-h-screen">
      <div class="max-w-3xl mx-auto px-4 py-12">
        <div class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div class="p-8 bg-gradient-to-br from-slate-50 to-white">
            <div class="text-xs uppercase tracking-widest text-slate-500">KingSelection</div>
            <h1 class="mt-2 text-3xl font-extrabold">{{ $gallery->nome_projeto }}</h1>
            <p class="mt-2 text-slate-600">Entre com seu e-mail e senha para ver a galeria.</p>
          </div>

          <div class="p-8">
            @if($errors->any())
              <div class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <div class="font-semibold">Não foi possível entrar</div>
                <ul class="mt-2 text-sm list-disc pl-5">
                  @foreach($errors->all() as $e)
                    <li>{{ $e }}</li>
                  @endforeach
                </ul>
              </div>
            @endif

            <form method="POST" action="/g/{{ $gallery->slug }}/login" class="space-y-4">
              @csrf
              <div>
                <label class="block text-sm font-semibold text-slate-700">E-mail</label>
                <input type="email" name="email" value="{{ old('email') }}" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Senha</label>
                <input type="password" name="senha" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button class="w-full mt-2 px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold">
                VER GALERIA
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>

