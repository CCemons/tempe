// script.js — Inicio
document.addEventListener('DOMContentLoaded', function () {

    var inputCSV  = document.getElementById('inputCSV');
    var dropZona  = document.getElementById('dropZona');
    var btnCambiar = document.getElementById('btnCambiar');

    // Al entrar, intentar cargar desde localStorage
    var guardados = CSVStore.obtenerRegistros();
    if (guardados && guardados.length > 0) {
        mostrar(guardados);
    }

    // Clic en el input
    if (inputCSV) {
        inputCSV.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) leer(file);
        });
    }

    // Drag & drop
    if (dropZona) {
        dropZona.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZona.style.background = 'rgba(37,99,235,0.08)';
        });
        dropZona.addEventListener('dragleave', function () {
            dropZona.style.background = '';
        });
        dropZona.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZona.style.background = '';
            var file = e.dataTransfer.files[0];
            if (file) leer(file);
        });
    }

    // Botón cambiar CSV
    if (btnCambiar) {
        btnCambiar.addEventListener('click', function () {
            CSVStore.limpiar();
            document.getElementById('panelDatos').style.display = 'none';
            document.getElementById('zonaSubida').style.display = '';
        });
    }

    function leer(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var registros = CSVStore.guardarYParsear(e.target.result);
            if (registros && registros.length > 0) {
                mostrar(registros);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    function mostrar(registros) {
        // Ocultar zona carga, mostrar panel
        document.getElementById('zonaSubida').style.display = 'none';
        document.getElementById('panelDatos').style.display = '';

        // Último día
        var ultimaFecha = registros[registros.length - 1].fecha;
        var dia = registros.filter(function (r) { return r.fecha === ultimaFecha; });

        set('lblDia', 'Último día registrado: ' + ultimaFecha);

        // Última medición
        var ult = dia[dia.length - 1];
        set('lblTemp',  ult.temp.toFixed(2) + ' °C');
        set('lblHora',  'Última lectura: ' + ult.hora);

        var estadoEl = document.getElementById('lblEstado');
        if (estadoEl) {
            if      (ult.temp >= 33) { estadoEl.textContent = '🔴 TEMPERATURA ALTA';    estadoEl.style.color = '#dc2626'; }
            else if (ult.temp >= 28) { estadoEl.textContent = '🟡 TEMPERATURA ELEVADA'; estadoEl.style.color = '#d97706'; }
            else if (ult.temp <= 20) { estadoEl.textContent = '🔵 TEMPERATURA BAJA';    estadoEl.style.color = '#2563eb'; }
            else                     { estadoEl.textContent = '🟢 ESTADO ÓPTIMO';       estadoEl.style.color = '#059669'; }
        }

        // Stats
        var temps = dia.map(function (r) { return r.temp; });
        var max  = Math.max.apply(null, temps);
        var min  = Math.min.apply(null, temps);
        var prom = temps.reduce(function (a, b) { return a + b; }, 0) / temps.length;

        set('lblMax',  max.toFixed(2)  + ' °C');
        set('lblMin',  min.toFixed(2)  + ' °C');
        set('lblProm', prom.toFixed(2) + ' °C');
        set('lblN',    dia.length + ' mediciones');

        // Gráfica
        dibujar(dia);
    }

    function dibujar(datos) {
        var canvas = document.getElementById('grafica');
        if (!canvas || !datos.length) return;
        var ctx = canvas.getContext('2d');

        var W = Math.max((canvas.parentElement.offsetWidth || 600) - 26, 100);
        var H = 220;
        canvas.width  = W;
        canvas.height = H;

        var PAD = { top: 18, right: 15, bottom: 38, left: 50 };
        var pW = W - PAD.left - PAD.right;
        var pH = H - PAD.top  - PAD.bottom;

        var temps = datos.map(function (d) { return d.temp; });
        var minT  = Math.floor(Math.min.apply(null, temps)) - 1;
        var maxT  = Math.ceil (Math.max.apply(null, temps)) + 1;
        var rangT = maxT - minT || 1;

        function toX(i) { return PAD.left + (i / Math.max(datos.length - 1, 1)) * pW; }
        function toY(t) { return PAD.top  + pH - ((t - minT) / rangT) * pH; }

        ctx.clearRect(0, 0, W, H);

        // Fondo área
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(PAD.left, PAD.top, pW, pH);

        // Grilla
        for (var gi = 0; gi <= 4; gi++) {
            var gVal = minT + (gi / 4) * rangT;
            var gy   = toY(gVal);
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(PAD.left, gy); ctx.lineTo(PAD.left + pW, gy); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(gVal.toFixed(0) + '°', PAD.left - 6, gy + 4);
        }

        // Franja alerta 30°C
        if (maxT >= 30) {
            var yA = toY(30);
            ctx.fillStyle = 'rgba(239,68,68,0.05)';
            ctx.fillRect(PAD.left, PAD.top, pW, yA - PAD.top);
            ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            ctx.beginPath(); ctx.moveTo(PAD.left, yA); ctx.lineTo(PAD.left + pW, yA); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(220,38,38,0.6)';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText('30°C', PAD.left + 4, yA - 4);
        }

        // Relleno degradado
        var grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + pH);
        grad.addColorStop(0, 'rgba(37,99,235,0.18)');
        grad.addColorStop(1, 'rgba(37,99,235,0.02)');
        ctx.beginPath();
        datos.forEach(function (d, i) {
            i === 0 ? ctx.moveTo(toX(i), toY(d.temp)) : ctx.lineTo(toX(i), toY(d.temp));
        });
        ctx.lineTo(toX(datos.length - 1), PAD.top + pH);
        ctx.lineTo(toX(0), PAD.top + pH);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();

        // Línea
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath();
        datos.forEach(function (d, i) {
            i === 0 ? ctx.moveTo(toX(i), toY(d.temp)) : ctx.lineTo(toX(i), toY(d.temp));
        });
        ctx.stroke();

        // Puntos
        datos.forEach(function (d, i) {
            ctx.beginPath();
            ctx.arc(toX(i), toY(d.temp), 3, 0, Math.PI * 2);
            ctx.fillStyle   = d.temp >= 30 ? '#dc2626' : '#2563eb';
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
            ctx.fill(); ctx.stroke();
        });

        // Eje X horas
        var step = Math.max(1, Math.ceil(datos.length / 8));
        ctx.fillStyle = '#94a3b8'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        datos.forEach(function (d, i) {
            if (i % step === 0 || i === datos.length - 1)
                ctx.fillText(d.hora.substring(0, 5), toX(i), H - PAD.bottom + 14);
        });

        // Marco
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
        ctx.strokeRect(PAD.left, PAD.top, pW, pH);
    }

    function set(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    window.addEventListener('resize', function () {
        var reg = CSVStore.obtenerRegistros();
        if (!reg || !reg.length) return;
        var uf  = reg[reg.length - 1].fecha;
        dibujar(reg.filter(function (r) { return r.fecha === uf; }));
    });
});