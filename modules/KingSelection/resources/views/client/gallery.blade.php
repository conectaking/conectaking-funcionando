<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ $gallery->nome_projeto }} — Galeria</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Anti-cópia: overlay transparente por cima da imagem */
      .antiCopyOverlay { position:absolute; inset:0; z-index:20; background:transparent; }
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900">
    <script>
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    </script>

    <div class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div class="font-bold truncate">{{ $gallery->nome_projeto }}</div>
        <div class="text-sm font-semibold">
          Selecionadas: <span id="selCount">0</span> de <span class="text-slate-500">{{ $gallery->total_fotos_contratadas ?: $gallery->photos->count() }}</span>
        </div>
        <a href="/g/{{ $gallery->slug }}/export" class="px-4 py-2 rounded-lg bg-indigo-700 text-white font-bold hover:bg-indigo-800">
          Revisar e Exportar
        </a>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        @foreach($gallery->photos as $p)
          @php $isSel = in_array($p->id, $selectedIds); @endphp
          <button
            class="group relative rounded-xl overflow-hidden border {{ $isSel ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200' }} bg-white shadow-sm"
            data-photo-id="{{ $p->id }}"
            data-selected="{{ $isSel ? '1' : '0' }}"
            onclick="toggleSel(this)"
            type="button"
          >
            <img loading="lazy" class="w-full h-40 object-cover select-none pointer-events-none" src="/media/photo/{{ $p->id }}/preview" alt="{{ $p->original_name }}" draggable="false" />
            <div class="antiCopyOverlay"></div>
            <div class="absolute top-2 right-2 z-10">
              <div class="w-7 h-7 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center">
                <span class="text-emerald-600 font-black" style="display: {{ $isSel ? 'block' : 'none' }}" data-check>✓</span>
              </div>
            </div>
            <div class="p-2 text-xs text-slate-600 font-mono truncate">{{ $p->original_name }}</div>
          </button>
        @endforeach
      </div>
    </div>

    <script>
      const initialSelected = Array.from(document.querySelectorAll('[data-selected="1"]')).length;
      const selCountEl = document.getElementById('selCount');
      selCountEl.textContent = String(initialSelected);

      async function toggleSel(btn) {
        const photoId = btn.getAttribute('data-photo-id');
        const wasSelected = btn.getAttribute('data-selected') === '1';

        // Otimista na UI
        btn.setAttribute('data-selected', wasSelected ? '0' : '1');
        btn.classList.toggle('border-emerald-500', !wasSelected);
        btn.classList.toggle('ring-2', !wasSelected);
        btn.classList.toggle('ring-emerald-400', !wasSelected);
        const check = btn.querySelector('[data-check]');
        if (check) check.style.display = wasSelected ? 'none' : 'block';
        selCountEl.textContent = String(parseInt(selCountEl.textContent || '0', 10) + (wasSelected ? -1 : 1));

        try {
          const res = await fetch('/g/{{ $gallery->slug }}/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
            body: JSON.stringify({ photo_id: parseInt(photoId, 10) })
          });
          if (!res.ok) throw new Error('Falha ao salvar seleção');
        } catch (e) {
          // Reverter se falhar
          btn.setAttribute('data-selected', wasSelected ? '1' : '0');
          btn.classList.toggle('border-emerald-500', wasSelected);
          btn.classList.toggle('ring-2', wasSelected);
          btn.classList.toggle('ring-emerald-400', wasSelected);
          if (check) check.style.display = wasSelected ? 'block' : 'none';
          selCountEl.textContent = String(parseInt(selCountEl.textContent || '0', 10) + (wasSelected ? 1 : -1));
          alert('Não foi possível salvar sua seleção. Tente novamente.');
        }
      }
    </script>
  </body>
</html>

