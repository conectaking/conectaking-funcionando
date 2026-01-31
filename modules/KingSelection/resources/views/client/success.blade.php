<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seleção finalizada</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-slate-900">
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="max-w-lg w-full rounded-3xl border border-slate-200 bg-white shadow-sm p-10 text-center">
        <div class="text-4xl font-black text-emerald-600">PARABÉNS!</div>
        <div class="mt-3 text-xl font-extrabold">SUA SELEÇÃO FOI FINALIZADA!</div>
        <p class="mt-3 text-slate-600">Obrigado. Sua seleção foi enviada com sucesso.</p>
        <a href="/g/{{ $gallery->slug }}" class="inline-flex mt-8 px-5 py-3 rounded-xl bg-indigo-700 text-white font-bold hover:bg-indigo-800">
          Voltar para o início
        </a>
      </div>
    </div>
  </body>
</html>

