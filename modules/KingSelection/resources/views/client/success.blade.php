<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seleção finalizada</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-50 text-slate-900">
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="max-w-lg w-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        @if(!empty($thankYouImageUrl))
          <div class="aspect-video w-full bg-slate-200">
            <img src="{{ $thankYouImageUrl }}" alt="" class="w-full h-full object-cover" />
          </div>
        @endif
        <div class="p-8 sm:p-10 text-center">
          <div class="text-4xl font-black text-emerald-600">{{ $thankYouTitle }}</div>
          <div class="mt-3 text-xl font-extrabold text-slate-800">Sua seleção foi finalizada!</div>
          <p class="mt-4 text-slate-600 leading-relaxed">{{ $thankYouMessageResolved }}</p>
          <a href="/g/{{ $gallery->slug }}" class="inline-flex mt-8 px-5 py-3 rounded-xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition">
            Sair
          </a>
        </div>
      </div>
    </div>
  </body>
</html>
