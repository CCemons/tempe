// script-analisis.js — Análisis histórico
document.addEventListener('DOMContentLoaded', function () {

    var registros    = [];
    var filtroActivo = 'todo';

    var canvas    = document.getElementById('graficaHistorica');
    var ctx       = canvas ? canvas.getContext('2d') : null;
    var cuerpoTab = document.getElementById('cuerpoTabla');
    var filtroSel = document.getElementById('filtroTiempo');
    var inputCSV  = document.getElementById('inputCSV');
    var dropZone  = document.getElementById('dropZone');

    // Cargar automáticamente desde localStorage
    var guardados = CSVStore.obtenerRegistros();
    if (guardados && guardados.length > 0) {
        registros = guardados;
        mostrarContenido();
        poblarFiltro();
        renderTodo();
    }

    // Cambio de filtro
    if (filtroSel) {
        filtroSel.addEventListener('change', function () {
            filtroActivo = filtroSel.value;
            renderTodo();
        });
    }

    // Carga nueva
    if (inputCSV) {
        inputCSV.addEventListener('change', function (e) {
            if (e.target.files[0]) leer(e.target.files[0]);
        });
    }
    if (dropZone) {
        dropZone.addEventListener('dragover', function (e) { e.preventDefault(); });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            if (e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]);
        });
    }

    function leer(file) {
        var lbl = document.getElementById('lblArchivo');
        if (lbl) lbl.textContent = '📄 ' + file.name;
        var reader = new FileReader();
        reader.onload = function (e) {
            var r = CSVStore.guardarYParsear(e.target.result);
            if (!r || !r.length) return;
            registros = r;
            mostrarContenido();
            poblarFiltro();
            renderTodo();
        };
        reader.readAsText(file, 'UTF-8');
    }

    function mostrarContenido() {
        set_display('seccionVacio',   'none');
        set_display('seccionGrafica', '');
        set_display('seccionTabla',   '');
        // Poner zona carga en modo compacto
        var dz = document.getElementById('dropZone');
        if (dz) dz.classList.add('compacto');
        var hint = document.getElementById('hintCSV');
        if (hint) hint.style.display = 'none';
    }

    function poblarFiltro() {
        if (!filtroSel) return;
        var diasSet = {};
        registros.forEach(function (r) { diasSet[r.fecha] = (diasSet[r.fecha] || 0) + 1; });
        var dias = Object.keys(diasSet).sort(function (a, b) {
            var pa = a.split('/'); var pb = b.split('/');
            return new Date(+pa[2], +pa[1]-1, +pa[0]) - new Date(+pb[2], +pb[1]-1, +pb[0]);
        });
        filtroSel.innerHTML = '<option value="todo">Todos los días — ' + registros.length + ' mediciones</option>';
        dias.forEach(function (d) {
            filtroSel.innerHTML += '<option value="' + d + '">' + d + '  (' + diasSet[d] + ' mediciones)</option>';
        });
        filtroActivo = 'todo';
    }

    function filtrar() {
        if (filtroActivo === 'todo') return registros;
        return registros.filter(function (r) { return r.fecha === filtroActivo; });
    }

    function renderTodo() {
        var datos = filtrar();
        stats(datos);
        tabla(datos);
        grafica(datos);
    }

    function stats(datos) {
        if (!datos.length) return;
        var temps = datos.map(function (d) { return d.temp; });
        var max  = Math.max.apply(null, temps);
        var min  = Math.min.apply(null, temps);
        var prom = temps.reduce(function (a, b) { return a + b; }, 0) / temps.length;
        set('sMax',  max.toFixed(2)  + ' °C');
        set('sMin',  min.toFixed(2)  + ' °C');
        set('sProm', prom.toFixed(2) + ' °C');
        set('sN',    datos.length);
        set('lblTotal', datos.length + ' registros');
        var rng = document.getElementById('rangoFechas');
        if (rng) rng.textContent = datos[0].fecha + ' ' + datos[0].hora + '  →  ' + datos[datos.length-1].fecha + ' ' + datos[datos.length-1].hora;
    }

    function tabla(datos) {
        if (!cuerpoTab) return;
        var filas = '';
        var slice = datos.slice(-25).reverse();
        slice.forEach(function (r) {
            var estado, color;
            if      (r.temp >= 33) { estado = '🔴 ALTO';    color = '#dc2626'; }
            else if (r.temp >= 28) { estado = '🟡 ELEVADO'; color = '#d97706'; }
            else if (r.temp <= 20) { estado = '🔵 BAJO';    color = '#2563eb'; }
            else                   { estado = '🟢 NORMAL';  color = '#059669'; }
            filas +=
                '<tr>' +
                '<td style="font-family:\'JetBrains Mono\',monospace;font-size:0.8rem;">' + r.fecha + '  ' + r.hora + '</td>' +
                '<td><strong style="font-family:\'Orbitron\',sans-serif;font-size:0.88rem;">' + r.temp.toFixed(2) + ' °C</strong></td>' +
                '<td style="color:' + color + ';font-weight:700;font-size:0.8rem;">' + estado + '</td>' +
                '</tr>';
        });
        cuerpoTab.innerHTML = filas;
    }

    function grafica(datos) {
        if (!ctx || !datos.length) return;

        var W = Math.max((canvas.parentElement.offsetWidth || 700) - 2, 100);
        var H = 300;
        canvas.width  = W;
        canvas.height = H;

        var PAD = { top: 20, right: 20, bottom: 52, left: 55 };
        var pW = W - PAD.left - PAD.right;
        var pH = H - PAD.top  - PAD.bottom;

        var temps = datos.map(function (d) { return d.temp; });
        var minT  = Math.floor(Math.min.apply(null, temps)) - 1;
        var maxT  = Math.ceil (Math.max.apply(null, temps)) + 1;
        var rangT = maxT - minT || 1;

        function toX(i) { return PAD.left + (i / Math.max(datos.length - 1, 1)) * pW; }
        function toY(t) { return PAD.top  + pH - ((t - minT) / rangT) * pH; }

        ctx.clearRect(0, 0, W, H);

        // Fondo
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(PAD.left, PAD.top, pW, pH);

        // Grilla
        for (var gi = 0; gi <= 6; gi++) {
            var gv = minT + (gi / 6) * rangT;
            var gy = toY(gv);
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
            ctx.setLineDash(gi === 0 ? [] : [4, 4]);
            ctx.beginPath(); ctx.moveTo(PAD.left, gy); ctx.lineTo(PAD.left + pW, gy); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#64748b'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'right';
            ctx.fillText(gv.toFixed(1) + '°', PAD.left - 7, gy + 4);
        }

        // Franja 30°C
        if (maxT >= 30) {
            var yAlerta = toY(30);
            ctx.fillStyle = 'rgba(239,68,68,0.05)';
            ctx.fillRect(PAD.left, PAD.top, pW, yAlerta - PAD.top);
            ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1;
            ctx.setLineDash([6, 3]);
            ctx.beginPath(); ctx.moveTo(PAD.left, yAlerta); ctx.lineTo(PAD.left + pW, yAlerta); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(220,38,38,0.6)'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
            ctx.fillText('⚠ 30°C', PAD.left + 5, yAlerta - 4);
        }

        // Relleno
        var grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + pH);
        grad.addColorStop(0, 'rgba(37,99,235,0.18)');
        grad.addColorStop(1, 'rgba(37,99,235,0.02)');
        ctx.beginPath();
        datos.forEach(function (d, i) { i === 0 ? ctx.moveTo(toX(i), toY(d.temp)) : ctx.lineTo(toX(i), toY(d.temp)); });
        ctx.lineTo(toX(datos.length - 1), PAD.top + pH);
        ctx.lineTo(toX(0), PAD.top + pH);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();

        // Línea
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath();
        datos.forEach(function (d, i) { i === 0 ? ctx.moveTo(toX(i), toY(d.temp)) : ctx.lineTo(toX(i), toY(d.temp)); });
        ctx.stroke();

        // Puntos (≤ 100)
        if (datos.length <= 100) {
            datos.forEach(function (d, i) {
                ctx.beginPath(); ctx.arc(toX(i), toY(d.temp), 3, 0, Math.PI * 2);
                ctx.fillStyle = d.temp >= 30 ? '#dc2626' : '#2563eb';
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
                ctx.fill(); ctx.stroke();
            });
        }

        // Eje X horas
        var step = Math.max(1, Math.ceil(datos.length / 10));
        ctx.fillStyle = '#64748b'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        datos.forEach(function (d, i) {
            if (i % step === 0 || i === datos.length - 1) {
                ctx.fillText(d.hora.substring(0, 5), toX(i), H - PAD.bottom + 15);
                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(toX(i), PAD.top + pH); ctx.lineTo(toX(i), PAD.top + pH + 4); ctx.stroke();
            }
        });

        // Fechas (vista todo)
        if (filtroActivo === 'todo') {
            var ultFecha = '';
            ctx.font = '8px JetBrains Mono, monospace'; ctx.fillStyle = '#94a3b8';
            datos.forEach(function (d, i) {
                if (d.fecha !== ultFecha && i % step === 0) {
                    ctx.fillText(d.fecha, toX(i), H - PAD.bottom + 28);
                    ultFecha = d.fecha;
                }
            });
        }

        // Marco
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
        ctx.strokeRect(PAD.left, PAD.top, pW, pH);
    }

    function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    function set_display(id, val) { var el = document.getElementById(id); if (el) el.style.display = val; }

    window.addEventListener('resize', function () {
        if (registros.length > 0) grafica(filtrar());
    });
});