/** clientes-recibos-orcamentos — Vite entry (extracted inline) */
import '@legacy/css/recibos-modulo-mobile.css';

tailwind.config = { darkMode: "class", theme: { extend: { colors: { primary: "#EAB308", "background-dark": "#0A0A0A", "card-dark": "#171717", "border-dark": "#262626" }, fontFamily: { display: ["Inter", "sans-serif"] } } } };

(function() {
    var CLIENTES_KEY = 'recibosOrcamentosClientes';

    function getClientes() {
        try {
            var s = localStorage.getItem(CLIENTES_KEY);
            return s ? JSON.parse(s) : [];
        } catch (e) { return []; }
    }

    function saveClientes(list) {
        try {
            localStorage.setItem(CLIENTES_KEY, JSON.stringify(list));
        } catch (e) { alert('Erro ao salvar.'); }
    }

    function renderLista() {
        var list = getClientes();
        var container = document.getElementById('lista-clientes');
        var empty = document.getElementById('empty-clientes');
        container.innerHTML = '';
        if (!list.length) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        list.forEach(function(c, i) {
            var tr = document.createElement('div');
            tr.className = 'flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-black/40';
            tr.innerHTML = '<div><span class="font-medium dark:text-white">' + escapeHtml(c.nome || '') + '</span><span class="text-slate-500 text-sm ml-2">' + escapeHtml(c.cpf_cnpj || '') + '</span></div>' +
                '<button type="button" class="btn-excluir text-red-500 hover:text-red-400 text-sm" data-i="' + i + '" title="Excluir"><span class="material-icons-outlined text-base">delete</span></button>';
            container.appendChild(tr);
            tr.querySelector('.btn-excluir').onclick = function() {
                if (confirm('Excluir este cliente?')) {
                    var arr = getClientes();
                    arr.splice(parseInt(this.dataset.i, 10), 1);
                    saveClientes(arr);
                    renderLista();
                }
            };
        });
    }

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    document.getElementById('form-cliente').onsubmit = function(e) {
        e.preventDefault();
        var nome = document.querySelector('#form-cliente input[name="nome"]').value.trim();
        if (!nome) return;
        var cliente = {
            nome: nome,
            cpf_cnpj: (document.querySelector('#form-cliente input[name="cpf_cnpj"]').value || '').trim(),
            endereco: (document.querySelector('#form-cliente input[name="endereco"]').value || '').trim(),
            contato: (document.querySelector('#form-cliente input[name="contato"]').value || '').trim()
        };
        var list = getClientes();
        list.push(cliente);
        saveClientes(list);
        renderLista();
        this.reset();
        document.getElementById('cliente-nome').focus();
    };

    renderLista();
})();
