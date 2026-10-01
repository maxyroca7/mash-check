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

  // ¿Esta respuesta es un problema a atender?
  //   bienMal: siempre "Mal".
  //   siNo: depende de la columna (propiedad "problema": 'no', 'si' o 'ninguno'). Si la columna
  //   no lo define no se juzga: el reporte no puede adivinar cuál respuesta es la mala.
  function esProblema(col, valor) {
    if (col.tipo === 'bienMal') return valor === 'mal';
    if (col.tipo === 'siNo') return Boolean(col.problema) && col.problema !== 'ninguno' && valor === col.problema;
    return false;
  }

  function respuestaDe(col, valor) {
    if (col.tipo === 'bienMal') return valor === 'mal' ? 'Mal' : 'Bien';
    return valor === 'si' ? 'Sí' : 'No';
  }

  // Ítems con alguna respuesta problemática, con el motivo ("Disponible: No") y lo escrito en
  // las columnas de texto de esa fila (acción, responsable, observaciones...).
  function itemsAtender(reg) {
    const items = [];
    reg.planilla.secciones.forEach((sec) => {
      sec.filas.forEach((fila) => {
        const valorDe = (col) => reg.datos[sec.id + '.' + fila.key + '.' + col.key];
        const motivos = sec.columnas
          .filter((col) => esProblema(col, valorDe(col)))
          .map((col) => col.label + ': ' + respuestaDe(col, valorDe(col)));
        if (!motivos.length) return;
        const detalle = sec.columnas
          .filter((col) => col.tipo === 'texto')
          .map((col) => ({ label: col.label, valor: (valorDe(col) || '').trim() }))
          .filter((x) => x.valor);
        items.push({ seccion: sec.titulo, item: fila.label, motivos: motivos, detalle: detalle });
      });
    });
    return items;
  }

  // Casillas Sí/No y Bien/Mal que quedaron sin tocar. Los "check" no cuentan: no tildar
  // un "Realizado" es una respuesta válida ("todavía no se hizo").
  function sinResponder(reg) {
    let cantidad = 0;
    reg.planilla.secciones.forEach((sec) => {
      sec.filas.forEach((fila) => {
        sec.columnas.forEach((col) => {
          if ((col.tipo === 'siNo' || col.tipo === 'bienMal') && !reg.datos[sec.id + '.' + fila.key + '.' + col.key]) cantidad++;
        });
      });
    });
    return cantidad;
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
    if (col.tipo === 'siNo' || col.tipo === 'bienMal') {
      const juzga = col.tipo === 'bienMal' || (col.problema && col.problema !== 'ninguno');
      const clase = !juzga ? '' : (esProblema(col, valor) ? ' r-mal' : ' r-bien');
      return '<td class="r-centro' + clase + '">' + respuestaDe(col, valor) + '</td>';
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
    const pendientes = [];
    registros.forEach((reg) => {
      itemsAtender(reg).forEach((it) => {
        const detalle = it.detalle.map((d) => esc(d.label) + ': ' + esc(d.valor)).join(' · ');
        filas.push('<li><b>' + esc(reg.planilla.titulo) + '</b> (' + esc(resumenCabecera(reg)) + ') — ' +
          esc(it.item) + ' <span class="r-motivo">[' + esc(it.motivos.join(', ')) + ']</span>' +
          (detalle ? '<br><span class="r-detalle">' + detalle + '</span>' : '') + '</li>');
      });
      const faltan = sinResponder(reg);
      if (faltan) pendientes.push(esc(reg.planilla.titulo) + ' (' + esc(resumenCabecera(reg)) + '): ' + faltan);
    });

    const atender = filas.length
      ? '<p class="r-alerta">' + filas.length + (filas.length === 1 ? ' ítem para atender' : ' ítems para atender') +
        '</p><ul class="r-lista">' + filas.join('') + '</ul>'
      : '<p class="r-ok">✔ Ningún ítem para atender.</p>';
    const faltantes = pendientes.length
      ? '<p class="r-pend"><b>Sin responder:</b> ' + pendientes.join(' · ') + '</p>' : '';
    return atender + faltantes;
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
      const items = itemsAtender(reg);
      const faltan = sinResponder(reg);
      total += items.length;
      const quien = resumenCabecera(reg);
      lineas.push('', '• ' + reg.planilla.titulo + (quien ? ' (' + quien + ')' : '') + ': ' +
        (items.length ? items.length + ' para atender' : 'nada para atender') +
        (faltan ? ' · ' + faltan + ' sin responder' : ''));
      items.forEach((it) => {
        const extra = it.detalle.map((d) => d.valor).join(' / ');
        lineas.push('   - ' + it.item + ' [' + it.motivos.join(', ') + ']' + (extra ? ' → ' + extra : ''));
      });
    });
    lineas.push('', total ? 'Total para atender: ' + total : 'Todo en orden.');
    return lineas.join('\n');
  }

  return { html, texto, esc };
})();
