/*
 * report.js — Arma el "Reporte del día" (HTML para ver e imprimir a PDF) y el resumen corto
 * para compartir por WhatsApp. NO guarda nada: solo lee registros y devuelve HTML o texto.
 * Misma idea que report.js de controlLinea.
 *
 * Todo sale de los datos del registro y de SU copia de la planilla (registro.planilla), así
 * que un reporte viejo se ve igual aunque la planilla se haya editado o borrado después.
 */
const Report = (() => {
  const EMPRESA = 'Agrofacil S.A.';

  function esc(texto) {
    const reemplazos = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => reemplazos[c]);
  }

  // '2026-09-30' -> '30/09/2026' (sin pasar por Date: evitaría el desfase de zona horaria).
  function fmtFecha(fecha) {
    const [a, m, d] = fecha.split('-');
    return d + '/' + m + '/' + a;
  }

  function resumenCabecera(reg) {
    return reg.planilla.cabecera.map((c) => reg.cabecera[c.key]).filter(Boolean).join(' · ');
  }

  // Ítems que quedaron en "Mal": es lo único que el reporte marca como problema.
  // Los Sí/No NO se juzgan: en "Disponible" el No es lo malo y en "Recargar" el Sí, y el
  // reporte no puede saber cuál es cuál. Esos se ven en la tabla completa.
  function itemsEnMal(reg) {
    const items = [];
    reg.planilla.secciones.forEach((sec) => {
      sec.filas.forEach((fila) => {
        const hayMal = sec.columnas.some((col) =>
          col.tipo === 'bienMal' && reg.datos[sec.id + '.' + fila.key + '.' + col.key] === 'mal');
        if (!hayMal) return;
        // Acompañamos con lo escrito en las columnas de texto de esa fila (acción, responsable...).
        const detalle = sec.columnas
          .filter((col) => col.tipo === 'texto')
          .map((col) => ({ label: col.label, valor: (reg.datos[sec.id + '.' + fila.key + '.' + col.key] || '').trim() }))
          .filter((x) => x.valor);
        items.push({ seccion: sec.titulo, item: fila.label, detalle: detalle });
      });
    });
    return items;
  }

  function nombres(registros) {
    const todos = [];
    registros.forEach((r) => {
      [r.cabecera.reviso, r.pie && r.pie.controlo].forEach((n) => { if (n && !todos.includes(n)) todos.push(n); });
    });
    return todos;
  }

  // ---------- HTML ----------

  function celda(col, valor) {
    if (col.tipo === 'texto') return '<td>' + esc(valor) + '</td>';
    if (!valor) return '<td class="r-centro r-nada">—</td>';
    if (col.tipo === 'siNo') return '<td class="r-centro">' + (valor === 'si' ? 'Sí' : 'No') + '</td>';
    if (col.tipo === 'bienMal') {
      return valor === 'mal' ? '<td class="r-centro r-mal">Mal</td>' : '<td class="r-centro r-bien">Bien</td>';
    }
    return '<td class="r-centro">✔</td>'; // check
  }

  function tablaSeccion(reg, sec) {
    const encabezado = '<th>Ítem</th>' + sec.columnas.map((c) => '<th>' + esc(c.label) + '</th>').join('');
    const filas = sec.filas.map((fila) =>
      '<tr><td class="r-item">' + esc(fila.label) + '</td>' +
      sec.columnas.map((col) => celda(col, reg.datos[sec.id + '.' + fila.key + '.' + col.key])).join('') +
      '</tr>'
    ).join('');
    return '<h4>' + esc(sec.titulo) + '</h4>' +
      '<div class="r-scroll"><table class="r-tabla"><thead><tr>' + encabezado + '</tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function htmlRegistro(reg) {
    const cabecera = reg.planilla.cabecera
      .filter((c) => reg.cabecera[c.key])
      .map((c) => '<span><b>' + esc(c.label) + ':</b> ' + esc(reg.cabecera[c.key]) + '</span>').join('');
    const pie = reg.planilla.pie
      .filter((c) => reg.pie[c.key])
      .map((c) => '<span><b>' + esc(c.label) + ':</b> ' + esc(reg.pie[c.key]) + '</span>').join('');
    const obs = reg.observaciones && reg.observaciones.trim()
      ? '<p class="r-obs"><b>Observaciones:</b> ' + esc(reg.observaciones) + '</p>' : '';

    return '<section class="r-registro">' +
      '<h3>' + esc(reg.planilla.titulo) + ' <small>' + esc(reg.planilla.codigo) + '</small></h3>' +
      '<p class="r-datos">' + cabecera + '</p>' +
      reg.planilla.secciones.map((sec) => tablaSeccion(reg, sec)).join('') +
      obs + '<p class="r-datos">' + pie + '</p>' +
    '</section>';
  }

  function htmlProblemas(registros) {
    const filas = [];
    registros.forEach((reg) => {
      itemsEnMal(reg).forEach((it) => {
        const detalle = it.detalle.map((d) => esc(d.label) + ': ' + esc(d.valor)).join(' · ');
        filas.push('<li><b>' + esc(reg.planilla.titulo) + '</b> (' + esc(resumenCabecera(reg)) + ') — ' +
          esc(it.item) + (detalle ? '<br><span class="r-detalle">' + detalle + '</span>' : '') + '</li>');
      });
    });
    if (!filas.length) return '<p class="r-ok">✔ Ningún ítem quedó en "Mal".</p>';
    return '<p class="r-alerta">' + filas.length + (filas.length === 1 ? ' ítem en "Mal"' : ' ítems en "Mal"') +
      '</p><ul class="r-lista">' + filas.join('') + '</ul>';
  }

  function html(fecha, registros) {
    const quienes = nombres(registros);
    const cuerpo = registros.length
      ? '<h2>Ítems a atender</h2>' + htmlProblemas(registros) + '<h2>Detalle</h2>' + registros.map(htmlRegistro).join('')
      : '<p class="vacio">No hay registros cargados este día.</p>';

    return '<article class="reporte">' +
      '<header class="r-cab"><div><h1>Reporte MASH del día</h1>' +
        '<p>' + esc(EMPRESA) + ' · Seguridad e Higiene</p></div>' +
        '<div class="r-fecha">' + fmtFecha(fecha) + '</div></header>' +
      '<p class="r-datos"><span><b>Planillas cargadas:</b> ' + registros.length + '</span>' +
        (quienes.length ? '<span><b>Control:</b> ' + esc(quienes.join(', ')) + '</span>' : '') + '</p>' +
      cuerpo +
    '</article>';
  }

  // ---------- texto para compartir ----------

  function texto(fecha, registros) {
    const lineas = ['MASH Check — ' + fmtFecha(fecha)];
    if (!registros.length) {
      lineas.push('Sin registros cargados.');
      return lineas.join('\n');
    }
    let total = 0;
    registros.forEach((reg) => {
      const items = itemsEnMal(reg);
      total += items.length;
      const quien = resumenCabecera(reg);
      lineas.push('', '• ' + reg.planilla.titulo + (quien ? ' (' + quien + ')' : '') + ': ' +
        (items.length ? items.length + ' en Mal' : 'sin ítems en Mal'));
      items.forEach((it) => {
        const extra = it.detalle.map((d) => d.valor).join(' / ');
        lineas.push('   - ' + it.item + (extra ? ' → ' + extra : ''));
      });
    });
    lineas.push('', total ? 'Total en Mal: ' + total : 'Todo en orden.');
    return lineas.join('\n');
  }

  return { html, texto, esc };
})();
