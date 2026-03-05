// csv-store.js — debe cargarse ANTES que script.js y script-analisis.js
var CSVStore = (function () {
    var KEY = 'termosense_csv';

    function guardar(texto) {
        try { localStorage.setItem(KEY, texto); } catch(e) { console.warn('localStorage no disponible:', e); }
    }

    function limpiar() {
        try { localStorage.removeItem(KEY); } catch(e) {}
    }

    function parsear(texto) {
        if (!texto) return [];
        var lineas = texto.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
        var resultado = [];
        var inicio = 0;
        if (lineas[0] && (lineas[0].toLowerCase().includes('fecha') || lineas[0].toLowerCase().includes('temp'))) {
            inicio = 1;
        }
        for (var i = inicio; i < lineas.length; i++) {
            var l = lineas[i].trim();
            if (!l || l.startsWith('**') || l.startsWith('//')) continue;
            var sep = l.includes(';') ? ';' : ',';
            var cols = l.split(sep).map(function(c){ return c.trim().replace(/"/g,''); });
            if (cols.length < 3) continue;
            var temp = parseFloat(cols[2].replace(',','.'));
            if (isNaN(temp)) continue;
            resultado.push({ fecha: cols[0], hora: cols[1], temp: temp });
        }
        return resultado;
    }

    function obtenerRegistros() {
        try {
            var texto = localStorage.getItem(KEY);
            if (!texto) return null;
            return parsear(texto);
        } catch(e) { return null; }
    }

    function guardarYParsear(texto) {
        guardar(texto);
        return parsear(texto);
    }

    return {
        guardar: guardar,
        limpiar: limpiar,
        parsear: parsear,
        obtenerRegistros: obtenerRegistros,
        guardarYParsear: guardarYParsear
    };
})();
