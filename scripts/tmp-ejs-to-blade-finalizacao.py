from pathlib import Path

src = Path(__file__).resolve().parents[1] / "views" / "kingSelectionConfigFinalizacao.ejs"
text = src.read_text(encoding="utf-8")
text = text.replace("<%= nomeProjeto %>", "{{ $nomeProjeto }}")
text = text.replace(
    "const galleryId = <%= galleryId %>;",
    "const galleryId = @json((int) $galleryId);",
)
text = text.replace(
    "const apiBase = '<%= apiBase %>';",
    "const apiBase = @json($apiBase);",
)
dst = (
    Path(__file__).resolve().parents[1]
    / "laravel"
    / "resources"
    / "views"
    / "cartao"
    / "ks-config-finalizacao.blade.php"
)
dst.write_text(text, encoding="utf-8")
print("wrote", dst, "bytes", dst.stat().st_size)
