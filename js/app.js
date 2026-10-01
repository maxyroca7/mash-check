/*
 * app.js — Interfaz: dibuja las pantallas (inicio, formulario de carga, reporte y editor de planillas)
 * y maneja los toques.
 *
 * Es una IIFE (función que se ejecuta sola) para que sus variables no se mezclen con las de
 * los otros archivos. Todo el texto que escribe el usuario pasa por esc() antes de ir a
 * innerHTML: sin eso, alguien que escriba "<b>" en una observación rompería la pantalla.
 */
(function () {
  'use strict';

  const vista = document.getElementById('vista');

  // Hay un "borrador" por cada cosa que se puede estar editando (nunca los dos a la vez):
  //   borrador = el REGISTRO que se está cargando/editando
  //   edicion  = la PLANILLA que se está creando/editando en el constructor
  // Los cambios van al borrador y solo se copian al Store con Guardar; así Cancelar no deja
  // nada a medias.
  const estado = { fecha: Store.hoy(), borrador: null, edicion: null };

  // Versión de la app en ESTE celular (se completa sola, ver mostrarVersion al final).
  let textoVersion = '';

  // Tipos de columna que ofrece el constructor (los mismos que sabe dibujar el formulario).
  const TIPOS_COLUMNA = [
    ['siNo', 'Sí / No'],
    ['bienMal', 'Bien / Mal'],
    ['check', 'Tilde (Realizado)'],
    ['texto', 'Texto']
  ];

  // ---------- utilidades ----------

  function esc(texto) {
    const reemplazos = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => reemplazos[c]);
  }

  // Copia profunda. Hace falta para editar: si trabajáramos sobre el objeto guardado,
  // un "Cancelar" dejaría los cambios a medias en memoria.
  function clonar(objeto) {
    return JSON.parse(JSON.stringify(objeto));
  }

  function horaDe(iso) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  // ====================================================================
  // PANTALLA DE INICIO
  // ====================================================================

  function pintarInicio() {
    estado.borrador = null;
    estado.edicion = null;
    const registros = Store.registrosDelDia(estado.fecha);
    const planillas = Store.planillas();

    // Si se borraron todas las planillas no puede quedar una pantalla sin salida.
    const bloquePlanillas = planillas.length
      ? planillas.map(htmlPlanilla).join('')
      : '<p class="vacio">No hay planillas.</p>' +
        '<button class="btn" data-act="pl-restaurar">Restaurar planillas de fábrica</button>';

    const lista = registros.length
      ? registros.map(tarjetaRegistro).join('')
      : '<p class="vacio">Todavía no cargaste nada este día.</p>';

    vista.innerHTML =
      '<div class="barra-fecha">' +
        '<label>Día <input type="date" id="filtro-fecha" value="' + esc(estado.fecha) + '"></label>' +
        '<button class="btn chico" data-act="hoy">Hoy</button>' +
      '</div>' +
      '<h2>Cargar planilla</h2>' +
      bloquePlanillas +
      '<button class="btn" data-act="pl-nueva">+ Nueva planilla</button>' +
      '<h2>Registros del día (' + registros.length + ')</h2>' + lista +
      '<button class="btn principal" data-act="reporte">Ver reporte del día</button>' +
      '<h2>Copia de seguridad</h2>' +
      '<p class="ayuda">Los datos están solo en este celular. Descargá un respaldo de vez en cuando: ' +
        'si borrás los datos del navegador o cambiás de celular, es lo único que los recupera.</p>' +
      '<button class="btn" data-act="respaldo-exportar">Descargar respaldo</button>' +
      '<button class="btn" data-act="respaldo-importar">Restaurar respaldo</button>' +
      // Input de archivo escondido: el botón de arriba lo "toca" por nosotros (el original es feo e incómodo).
      '<input type="file" id="archivo-respaldo" accept=".json,application/json" hidden>' +
      '<p class="version" id="version">' + esc(textoVersion) + '</p>';
  }

  // Una planilla: el botón grande para CARGAR y, abajo, sus tres acciones de administración.
  function htmlPlanilla(p) {
    const id = esc(p.id);
    return '<div class="planilla">' +
      '<button class="btn grande" data-act="nueva" data-id="' + id + '">' +
        '<span class="codigo">' + esc(p.codigo) + '</span>' + esc(p.titulo) +
      '</button>' +
      '<div class="planilla-botones">' +
        '<button class="btn chico" data-act="pl-editar" data-id="' + id + '">Editar</button>' +
        '<button class="btn chico" data-act="pl-duplicar" data-id="' + id + '">Duplicar</button>' +
        '<button class="btn chico peligro" data-act="pl-borrar" data-id="' + id + '">Borrar</button>' +
      '</div>' +
    '</div>';
  }

  function tarjetaRegistro(reg) {
    // Resumen: los datos de cabecera que se completaron (ej. "Calidad · Maxi").
    const resumen = reg.planilla.cabecera
      .map((c) => reg.cabecera[c.key])
      .filter(Boolean)
      .join(' · ');

    return '<div class="tarjeta">' +
      '<div class="tarjeta-texto">' +
        '<strong>' + esc(reg.planilla.titulo) + '</strong>' +
        '<span>' + esc(resumen) + '</span>' +
        '<span class="hora">Guardado ' + horaDe(reg.modificado) + '</span>' +
      '</div>' +
      '<div class="tarjeta-botones">' +
        '<button class="btn chico" data-act="editar" data-id="' + esc(reg.id) + '">Editar</button>' +
        '<button class="btn chico peligro" data-act="borrar" data-id="' + esc(reg.id) + '">Borrar</button>' +
      '</div>' +
    '</div>';
  }

  // ====================================================================
  // FORMULARIO DE CARGA (completar una planilla)
  // ====================================================================

  function pintarFormulario() {
    const b = estado.borrador;
    const p = b.planilla;

    const observaciones = p.observaciones
      ? '<div class="campo"><label>Observaciones</label>' +
          '<textarea rows="3" data-campo="observaciones">' + esc(b.observaciones) + '</textarea></div>'
      : '';

    vista.innerHTML =
      '<h2>' + esc(p.titulo) + '</h2>' +
      '<p class="codigo">' + esc(p.codigo) + '</p>' +
      '<div class="campo"><label>Día</label>' +
        '<input type="date" data-campo="fecha" value="' + esc(b.fecha) + '"></div>' +
      p.cabecera.map((c) => campoSimple('cabecera', c, b.cabecera[c.key])).join('') +
      p.secciones.map(htmlSeccion).join('') +
      observaciones +
      p.pie.map((c) => campoSimple('pie', c, b.pie[c.key])).join('') +
      '<div class="barra-guardar">' +
        '<button class="btn" data-act="cancelar">Cancelar</button>' +
        '<button class="btn principal" data-act="guardar">Guardar</button>' +
      '</div>';
    window.scrollTo(0, 0);
  }

  // Campo de cabecera o pie: lista desplegable si tiene opciones, caja de texto si no.
  function campoSimple(grupo, campo, valor) {
    let control;
    if (campo.tipo === 'opciones') {
      const opciones = campo.opciones.map((o) =>
        '<option value="' + esc(o) + '"' + (o === valor ? ' selected' : '') + '>' + esc(o) + '</option>'
      ).join('');
      control = '<select data-campo="' + grupo + '" data-k="' + esc(campo.key) + '">' +
        '<option value="">— Elegí —</option>' + opciones + '</select>';
    } else {
      control = '<input type="text" data-campo="' + grupo + '" data-k="' + esc(campo.key) +
        '" value="' + esc(valor) + '">';
    }
    return '<div class="campo"><label>' + esc(campo.label) + '</label>' + control + '</div>';
  }

  function htmlSeccion(seccion) {
    return '<h3>' + esc(seccion.titulo) + '</h3>' + seccion.filas.map((fila) => {
      const celdas = seccion.columnas.map((col) => {
        const clave = seccion.id + '.' + fila.key + '.' + col.key;
        return '<div class="celda"><span class="celda-label">' + esc(col.label) + '</span>' +
          controlDeCelda(col, clave) + '</div>';
      }).join('');
      return '<div class="fila"><p class="fila-titulo">' + esc(fila.label) + '</p>' +
        '<div class="celdas">' + celdas + '</div></div>';
    }).join('');
  }

  function controlDeCelda(col, clave) {
    const valor = estado.borrador.datos[clave];
    // siNo: el color sale de la propiedad "problema" de la columna. La respuesta que hay que
    // atender va en rojo y la otra en verde (en "Recargar" el Sí es rojo; en "Disponible", el No).
    // Si la columna no define cuál es el problema no podemos juzgar: dos colores neutros
    // (azul/naranja) que igual se distinguen entre sí.
    if (col.tipo === 'siNo') {
      let colorSi = 'azul';
      let colorNo = 'naranja';
      if (col.problema === 'no' || col.problema === 'si') {
        colorSi = col.problema === 'si' ? 'mal' : 'ok';
        colorNo = col.problema === 'no' ? 'mal' : 'ok';
      }
      return grupoBotones(clave, [['si', 'Sí', colorSi], ['no', 'No', colorNo]], valor);
    }
    // bienMal: "Mal" siempre es un problema.
    if (col.tipo === 'bienMal') return grupoBotones(clave, [['bien', 'Bien', 'ok'], ['mal', 'Mal', 'mal']], valor);
    if (col.tipo === 'check') return grupoBotones(clave, [['si', 'Realizado', '']], valor);
    return '<input type="text" data-campo="datos" data-k="' + esc(clave) + '" value="' + esc(valor) + '">';
  }

  // Grupo de botones grandes tipo "interruptor": tocar el elegido otra vez lo des-elige.
  function grupoBotones(clave, opciones, valor) {
    const botones = opciones.map((o) =>
      '<button type="button" class="opc ' + o[2] + (o[0] === valor ? ' sel' : '') +
      '" data-act="opcion" data-v="' + o[0] + '" aria-pressed="' + (o[0] === valor) + '">' + o[1] + '</button>'
    ).join('');
    return '<div class="grupo" data-k="' + esc(clave) + '">' + botones + '</div>';
  }

  // ---------- acciones del formulario de carga ----------

  function nuevoRegistro(idPlanilla) {
    const planilla = Store.planilla(idPlanilla);
    if (!planilla) return;
    const nombre = Store.ultimoNombre(); // para no volver a tipear el nombre en cada planilla
    estado.borrador = {
      id: null,
      planillaId: planilla.id,
      // Copia de la estructura: el registro conserva la planilla tal como era hoy,
      // aunque más adelante se edite o se borre la planilla.
      planilla: clonar(planilla),
      fecha: estado.fecha,
      cabecera: planilla.cabecera.some((c) => c.key === 'reviso') ? { reviso: nombre } : {},
      datos: {},
      observaciones: '',
      pie: planilla.pie.some((c) => c.key === 'controlo') ? { controlo: nombre } : {}
    };
    pintarFormulario();
  }

  function editarRegistro(id) {
    const reg = Store.obtener(id);
    if (!reg) return;
    estado.borrador = clonar(reg);
    pintarFormulario();
  }

  function guardar() {
    const b = estado.borrador;
    if (!b.fecha) {
      alert('Elegí el día antes de guardar.');
      return;
    }
    if (!Store.guardarRegistro(b)) {
      alert('No se pudo guardar: el celular no tiene espacio para la app. Todavía no se perdió nada de lo cargado antes.');
      return;
    }
    estado.fecha = b.fecha; // volvemos al día del registro para verlo en la lista
    pintarInicio();
  }

  function borrar(id) {
    const reg = Store.obtener(id);
    if (!reg || !confirm('¿Borrar "' + reg.planilla.titulo + '"? No se puede deshacer.')) return;
    if (!Store.borrar(id)) alert('No se pudo borrar. Probá de nuevo.');
    pintarInicio();
  }

  // Marca/desmarca un botón sin redibujar todo el formulario (redibujar haría saltar el scroll).
  function tocarOpcion(boton) {
    const grupo = boton.closest('.grupo');
    const clave = grupo.dataset.k;
    const datos = estado.borrador.datos;
    if (datos[clave] === boton.dataset.v) delete datos[clave];
    else datos[clave] = boton.dataset.v;

    grupo.querySelectorAll('.opc').forEach((o) => {
      const activo = datos[clave] === o.dataset.v;
      o.classList.toggle('sel', activo);
      o.setAttribute('aria-pressed', activo);
    });
  }

  // ====================================================================
  // REPORTE DEL DÍA Y RESPALDO
  // ====================================================================

  function pintarReporte() {
    estado.borrador = null;
    estado.edicion = null;
    const registros = Store.registrosDelDia(estado.fecha);
    // .no-print: la barra de botones no sale en el papel/PDF (ver @media print en styles.css).
    vista.innerHTML =
      '<section class="no-print">' +
        '<div class="barra-reporte">' +
          '<button class="btn" data-act="volver">← Volver</button>' +
          '<button class="btn principal" data-act="imprimir">Exportar PDF</button>' +
          '<button class="btn" data-act="compartir">Compartir resumen</button>' +
        '</div>' +
        '<p class="ayuda">Exportar PDF abre la ventana de impresión: elegí “Guardar como PDF”.</p>' +
      '</section>' +
      Report.html(estado.fecha, registros);
    window.scrollTo(0, 0);
  }

  function compartirResumen() {
    const texto = Report.texto(estado.fecha, Store.registrosDelDia(estado.fecha));
    if (navigator.share) {
      // Abre el menú de compartir del celular (WhatsApp, mail...). Si se cancela, no pasa nada.
      navigator.share({ title: 'MASH Check', text: texto }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(
        () => alert('Resumen copiado. Pegalo donde quieras.'),
        () => alert('No se pudo copiar el resumen.'));
    } else {
      alert(texto);
    }
  }

  // Baja un archivo JSON con TODO (planillas y registros), con la fecha en el nombre.
  function descargarRespaldo() {
    const blob = new Blob([Store.exportar()], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'mash-check-respaldo-' + Store.hoy() + '.json';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  }

  function restaurarRespaldo(archivo) {
    const lector = new FileReader();
    lector.onerror = () => alert('No se pudo leer el archivo.');
    lector.onload = () => {
      // Primero se REVISA sin tocar nada; recién después de que confirmes se reemplaza.
      const revision = Store.revisarRespaldo(lector.result);
      if (revision.error) { alert(revision.error); return; }
      const aviso = 'Este respaldo tiene ' + revision.registros + ' registros y ' + revision.planillas +
        ' planillas.\n\nVa a REEMPLAZAR todo lo que hay ahora en este celular. ¿Seguir?';
      if (!confirm(aviso)) return;
      if (!Store.importar(lector.result)) { alert('No se pudo restaurar el respaldo.'); return; }
      alert('Respaldo restaurado.');
      pintarInicio();
    };
    lector.readAsText(archivo);
  }

  // ====================================================================
  // CONSTRUCTOR DE PLANILLAS (crear / editar / duplicar / borrar)
  // ====================================================================
  //
  // El editor trabaja con una versión "cómoda para editar" de la planilla (el borrador):
  //   - las opciones de un desplegable y los ítems de una sección son UN texto con una línea
  //     por elemento (más rápido de tipear en el celu que un campo por ítem, y ordenar = ordenar
  //     las líneas);
  //   - las claves técnicas (s1, r1, c1...) no existen: se vuelven a generar al guardar.
  // Eso es seguro porque los registros ya cargados guardan su PROPIA copia de la planilla: no
  // dependen de que las claves de la planilla actual coincidan.

  function campoABorrador(c) {
    return { key: c.key, label: c.label, tipo: c.tipo, opcionesTexto: (c.opciones || []).join('\n') };
  }

  function planillaABorrador(p, comoCopia) {
    return {
      id: comoCopia ? null : p.id,
      codigo: p.codigo,
      titulo: comoCopia ? p.titulo + ' (copia)' : p.titulo,
      observaciones: p.observaciones,
      cabecera: p.cabecera.map(campoABorrador),
      pie: p.pie.map(campoABorrador),
      secciones: p.secciones.map((s) => ({
        titulo: s.titulo,
        columnas: s.columnas.map((c) => ({ label: c.label, tipo: c.tipo, problema: c.problema || 'ninguno' })),
        filasTexto: s.filas.map((f) => f.label).join('\n')
      }))
    };
  }

  function seccionVacia() {
    return { titulo: '', columnas: [{ label: '', tipo: 'siNo', problema: 'no' }], filasTexto: '' };
  }

  function abrirEditor(borrador) {
    estado.edicion = borrador;
    pintarEditor();
    window.scrollTo(0, 0);
  }

  function planillaNueva() {
    // "Revisó" ya viene puesto: con esa clave el nombre se recuerda solo (ver nuevoRegistro).
    abrirEditor({
      id: null, codigo: '', titulo: '', observaciones: false, pie: [],
      cabecera: [{ key: 'reviso', label: 'Revisó', tipo: 'texto', opcionesTexto: '' }],
      secciones: [seccionVacia()]
    });
  }

  // ---------- dibujo del editor ----------

  function pintarEditor() {
    const e = estado.edicion;
    // Al agregar/mover/quitar se redibuja todo; guardamos el scroll para no saltar al principio.
    const scroll = window.scrollY;

    vista.innerHTML =
      '<h2>' + (e.id ? 'Editar planilla' : 'Nueva planilla') + '</h2>' +
      campoEditor('Título', 'titulo', e.titulo) +
      campoEditor('Código (opcional)', 'codigo', e.codigo) +
      '<h3>Datos de arriba</h3>' + htmlListaCampos('cabecera') +
      '<h3>Secciones</h3>' + e.secciones.map(htmlSeccionEditor).join('') +
      '<button class="btn" data-act="b-agrega" data-lista="secciones">+ Agregar sección</button>' +
      '<label class="chk"><input type="checkbox" data-bcampo="observaciones"' +
        (e.observaciones ? ' checked' : '') + '> Cuadro de observaciones al final</label>' +
      '<h3>Datos del final</h3>' + htmlListaCampos('pie') +
      '<div class="barra-guardar">' +
        '<button class="btn" data-act="pl-cancelar">Cancelar</button>' +
        '<button class="btn principal" data-act="pl-guardar">Guardar planilla</button>' +
      '</div>';
    window.scrollTo(0, scroll);
  }

  function campoEditor(titulo, nombre, valor) {
    return '<div class="campo"><label>' + esc(titulo) + '</label>' +
      '<input type="text" data-bcampo="' + nombre + '" value="' + esc(valor) + '"></div>';
  }

  // Botones ▲ ▼ ✕ de un elemento de lista. "lista" + "i" (+ "s" para columnas) dicen cuál es.
  function botonesOrden(lista, i, s) {
    const datos = ' data-lista="' + lista + '" data-i="' + i + '"' + (s == null ? '' : ' data-s="' + s + '"');
    return '<div class="orden">' +
      '<button class="btn icono" data-act="b-sube"' + datos + ' aria-label="Subir">▲</button>' +
      '<button class="btn icono" data-act="b-baja"' + datos + ' aria-label="Bajar">▼</button>' +
      '<button class="btn icono peligro" data-act="b-quita"' + datos + ' aria-label="Quitar">✕</button>' +
    '</div>';
  }

  function atributosCampo(lista, i, prop, s) {
    return ' data-lista="' + lista + '" data-i="' + i + '" data-prop="' + prop + '"' +
      (s == null ? '' : ' data-s="' + s + '"');
  }

  function selectorTipo(opciones, actual, atributos) {
    return '<select' + atributos + '>' + opciones.map((o) =>
      '<option value="' + o[0] + '"' + (o[0] === actual ? ' selected' : '') + '>' + o[1] + '</option>'
    ).join('') + '</select>';
  }

  // Solo para columnas Sí/No: qué respuesta se marca como "para atender" en el reporte.
  function selectorProblema(col, ci, si) {
    if (col.tipo !== 'siNo') return '';
    return '<label class="celda-label">En el reporte, atender si responde:</label>' +
      selectorTipo([['no', 'No'], ['si', 'Sí'], ['ninguno', 'Ninguna (no marcar)']],
        col.problema || 'ninguno', atributosCampo('columnas', ci, 'problema', si));
  }

  // Lista de datos sueltos (cabecera = arriba, pie = al final de la planilla).
  function htmlListaCampos(lista) {
    const campos = estado.edicion[lista].map((c, i) => {
      const opciones = c.tipo === 'opciones'
        ? '<textarea rows="3" placeholder="Una opción por línea"' +
            atributosCampo(lista, i, 'opcionesTexto') + '>' + esc(c.opcionesTexto) + '</textarea>'
        : '';
      return '<div class="bloque">' +
        '<input type="text" placeholder="Nombre del dato (ej. Sector)" value="' + esc(c.label) + '"' +
          atributosCampo(lista, i, 'label') + '>' +
        selectorTipo([['texto', 'Texto libre'], ['opciones', 'Elegir de una lista']], c.tipo,
          atributosCampo(lista, i, 'tipo')) +
        opciones + botonesOrden(lista, i) +
      '</div>';
    }).join('');
    return campos + '<button class="btn chico" data-act="b-agrega" data-lista="' + lista + '">+ Agregar dato</button>';
  }

  function htmlSeccionEditor(sec, si) {
    const columnas = sec.columnas.map((col, ci) =>
      '<div class="bloque interno">' +
        '<input type="text" placeholder="Nombre de la columna (ej. Condición)" value="' + esc(col.label) + '"' +
          atributosCampo('columnas', ci, 'label', si) + '>' +
        selectorTipo(TIPOS_COLUMNA, col.tipo, atributosCampo('columnas', ci, 'tipo', si)) +
        selectorProblema(col, ci, si) +
        botonesOrden('columnas', ci, si) +
      '</div>'
    ).join('');

    return '<div class="bloque seccion">' +
      '<input type="text" placeholder="Título de la sección" value="' + esc(sec.titulo) + '"' +
        atributosCampo('secciones', si, 'titulo') + '>' +
      botonesOrden('secciones', si) +
      '<p class="celda-label">Columnas (lo que se responde en cada ítem)</p>' + columnas +
      '<button class="btn chico" data-act="b-agrega" data-lista="columnas" data-s="' + si + '">+ Agregar columna</button>' +
      '<p class="celda-label">Ítems (uno por línea)</p>' +
      '<textarea rows="8"' + atributosCampo('secciones', si, 'filasTexto') + '>' + esc(sec.filasTexto) + '</textarea>' +
    '</div>';
  }

  // ---------- acciones del editor ----------

  // Devuelve el arreglo al que apunta un botón/campo del editor.
  function obtenerLista(nombre, s) {
    const e = estado.edicion;
    return nombre === 'columnas' ? e.secciones[Number(s)].columnas : e[nombre];
  }

  function mover(lista, i, delta) {
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    const temporal = lista[i];
    lista[i] = lista[j];
    lista[j] = temporal;
  }

  function accionEditor(boton) {
    const d = boton.dataset;
    const lista = obtenerLista(d.lista, d.s);
    const i = Number(d.i);

    if (d.act === 'b-sube') mover(lista, i, -1);
    if (d.act === 'b-baja') mover(lista, i, 1);
    if (d.act === 'b-quita') {
      // Una sección arrastra todos sus ítems: ahí sí confirmamos.
      if (d.lista === 'secciones' && !confirm('¿Quitar la sección con todos sus ítems?')) return;
      lista.splice(i, 1);
    }
    if (d.act === 'b-agrega') {
      if (d.lista === 'secciones') lista.push(seccionVacia());
      else if (d.lista === 'columnas') lista.push({ label: '', tipo: 'siNo', problema: 'no' });
      else lista.push({ key: null, label: '', tipo: 'texto', opcionesTexto: '' });
    }
    pintarEditor();
  }

  // Cada línea no vacía de un textarea es un elemento.
  function lineas(texto) {
    return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }

  // Convierte los datos sueltos del borrador en campos de planilla. Los que ya tenían clave la
  // conservan (así "reviso" sigue recordando el nombre); los nuevos reciben "campo1", "campo2"...
  function construirCampos(campos, nombreLista) {
    const usadas = new Set(campos.map((c) => c.key).filter(Boolean));
    let contador = 0;
    const resultado = [];
    for (const c of campos) {
      const label = c.label.trim();
      if (!label) return { error: 'Hay un dato sin nombre en "' + nombreLista + '".' };
      let key = c.key;
      while (!key) {
        contador += 1;
        if (!usadas.has('campo' + contador)) { key = 'campo' + contador; usadas.add(key); }
      }
      const campo = { key: key, label: label, tipo: c.tipo };
      if (c.tipo === 'opciones') {
        campo.opciones = lineas(c.opcionesTexto);
        if (!campo.opciones.length) return { error: 'El dato "' + label + '" necesita al menos una opción.' };
      }
      resultado.push(campo);
    }
    return { campos: resultado };
  }

  // Valida el borrador y arma la planilla final. Devuelve { planilla } o { error }.
  function construirPlanilla(e) {
    const titulo = e.titulo.trim();
    if (!titulo) return { error: 'Falta el título de la planilla.' };
    if (!e.secciones.length) return { error: 'La planilla necesita al menos una sección.' };

    const cabecera = construirCampos(e.cabecera, 'Datos de arriba');
    if (cabecera.error) return cabecera;
    const pie = construirCampos(e.pie, 'Datos del final');
    if (pie.error) return pie;

    const secciones = [];
    for (let si = 0; si < e.secciones.length; si++) {
      const s = e.secciones[si];
      const tituloSeccion = s.titulo.trim();
      if (!tituloSeccion) return { error: 'La sección ' + (si + 1) + ' no tiene título.' };
      if (!s.columnas.length) return { error: 'La sección "' + tituloSeccion + '" necesita al menos una columna.' };
      if (s.columnas.some((c) => !c.label.trim())) return { error: 'Hay una columna sin nombre en "' + tituloSeccion + '".' };
      const filas = lineas(s.filasTexto);
      if (!filas.length) return { error: 'La sección "' + tituloSeccion + '" necesita al menos un ítem.' };

      secciones.push({
        id: 's' + (si + 1),
        titulo: tituloSeccion,
        columnas: s.columnas.map((c, ci) => {
          const col = { key: 'c' + (ci + 1), label: c.label.trim(), tipo: c.tipo };
          // Se guarda siempre (aunque sea "ninguno"): así se distingue de una columna vieja
          // que nunca lo tuvo y la migración de Store no le pisa la elección.
          if (c.tipo === 'siNo') col.problema = c.problema || 'ninguno';
          return col;
        }),
        filas: filas.map((label, fi) => ({ key: 'r' + (fi + 1), label: label }))
      });
    }

    return {
      planilla: {
        id: e.id, codigo: e.codigo.trim(), titulo: titulo,
        cabecera: cabecera.campos, secciones: secciones,
        observaciones: Boolean(e.observaciones), pie: pie.campos
      }
    };
  }

  function guardarPlanilla() {
    const resultado = construirPlanilla(estado.edicion);
    if (resultado.error) {
      alert(resultado.error);
      return;
    }
    if (!Store.guardarPlanilla(resultado.planilla)) {
      alert('No se pudo guardar la planilla: el celular no tiene espacio para la app.');
      return;
    }
    pintarInicio();
  }

  function borrarPlanilla(id) {
    const p = Store.planilla(id);
    if (!p) return;
    const aviso = '¿Borrar la planilla "' + p.titulo + '"?\n\nLos registros que ya cargaste con ella NO se borran.';
    if (!confirm(aviso)) return;
    if (!Store.borrarPlanilla(id)) alert('No se pudo borrar. Probá de nuevo.');
    pintarInicio();
  }

  // Lo que se escribe en el editor va directo al borrador (sin redibujar, para no perder el foco).
  function entradaEditor(campo) {
    const e = estado.edicion;
    const d = campo.dataset;
    if (d.bcampo) {
      e[d.bcampo] = campo.type === 'checkbox' ? campo.checked : campo.value;
      return;
    }
    if (!d.prop) return;
    obtenerLista(d.lista, d.s)[Number(d.i)][d.prop] = campo.value;
    // Cambiar el tipo puede mostrar/ocultar otros controles (opciones, "atender si"): ahí sí redibujamos.
    if (d.prop === 'tipo') pintarEditor();
  }

  // ====================================================================
  // EVENTOS (un solo oyente para toda la pantalla)
  // ====================================================================
  // "Delegación de eventos": en vez de poner un oyente en cada botón (que se pierde cada vez
  // que redibujamos), ponemos uno en #vista y miramos qué se tocó con data-act.

  vista.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-act]');
    if (!boton) return;
    const accion = boton.dataset.act;

    if (accion.startsWith('b-')) { accionEditor(boton); return; }

    switch (accion) {
      case 'nueva': nuevoRegistro(boton.dataset.id); break;
      case 'editar': editarRegistro(boton.dataset.id); break;
      case 'borrar': borrar(boton.dataset.id); break;
      case 'hoy': estado.fecha = Store.hoy(); pintarInicio(); break;
      case 'opcion': tocarOpcion(boton); break;
      case 'guardar': guardar(); break;
      case 'cancelar':
        if (confirm('¿Salir sin guardar lo que cargaste?')) pintarInicio();
        break;
      case 'pl-nueva': planillaNueva(); break;
      case 'pl-editar': abrirEditor(planillaABorrador(Store.planilla(boton.dataset.id), false)); break;
      // Duplicar NO crea nada todavía: abre el editor con una copia y recién se guarda con Guardar.
      case 'pl-duplicar': abrirEditor(planillaABorrador(Store.planilla(boton.dataset.id), true)); break;
      case 'pl-borrar': borrarPlanilla(boton.dataset.id); break;
      case 'pl-guardar': guardarPlanilla(); break;
      case 'pl-cancelar':
        if (confirm('¿Salir sin guardar los cambios de la planilla?')) pintarInicio();
        break;
      case 'pl-restaurar': Store.restaurarDeFabrica(); pintarInicio(); break;
      case 'reporte': pintarReporte(); break;
      case 'volver': pintarInicio(); break;
      case 'imprimir': window.print(); break;
      case 'compartir': compartirResumen(); break;
      case 'respaldo-exportar': descargarRespaldo(); break;
      case 'respaldo-importar': document.getElementById('archivo-respaldo').click(); break;
    }
  });

  // Cada vez que se escribe en un campo, lo copiamos al borrador que corresponda.
  vista.addEventListener('input', (e) => {
    if (estado.edicion) { entradaEditor(e.target); return; }
    const campo = e.target.dataset.campo;
    if (!campo || !estado.borrador) return;
    const b = estado.borrador;
    if (campo === 'fecha') b.fecha = e.target.value;
    else if (campo === 'observaciones') b.observaciones = e.target.value;
    else b[campo][e.target.dataset.k] = e.target.value; // cabecera, pie o datos
  });

  // Selector de día de la pantalla de inicio.
  vista.addEventListener('change', (e) => {
    if (e.target.id === 'archivo-respaldo' && e.target.files[0]) {
      restaurarRespaldo(e.target.files[0]);
      e.target.value = ''; // para poder elegir el mismo archivo otra vez
      return;
    }
    if (e.target.id === 'filtro-fecha' && e.target.value) {
      estado.fecha = e.target.value;
      pintarInicio();
    }
  });

  pintarInicio();

  // Registramos el service worker (la parte "sin conexión"). Solo con http/https: abierto como
  // archivo (file://) los navegadores no lo permiten.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Muestra la versión de la app que tiene ESTE celular (el nombre de la caché del service worker).
  // Sirve para comprobar que se actualizó después de subir cambios.
  function mostrarVersion() {
    if (!window.caches) return;
    caches.keys().then((nombres) => {
      const actual = nombres.filter((n) => n.startsWith('mash-check-')).sort().pop();
      if (!actual) return;
      textoVersion = 'Versión ' + actual.replace('mash-check-', '');
      const pie = document.getElementById('version');
      if (pie) pie.textContent = textoVersion; // si la pantalla principal ya está dibujada
    });
  }
  mostrarVersion();
})();
