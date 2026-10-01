/*
 * app.js — Interfaz: dibuja las dos pantallas (inicio y formulario) y maneja los toques.
 *
 * Es una IIFE (función que se ejecuta sola) para que sus variables no se mezclen con las de
 * los otros archivos. Todo el texto que escribe el usuario pasa por esc() antes de ir a
 * innerHTML: sin eso, alguien que escriba "<b>" en una observación rompería la pantalla.
 */
(function () {
  'use strict';

  const vista = document.getElementById('vista');

  // "borrador" = el registro que se está cargando/editando. Los cambios van ahí y solo se
  // copian al Store cuando se toca Guardar; así Cancelar no deja nada a medias.
  const estado = { fecha: Store.hoy(), borrador: null };

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

  // ---------- pantalla de INICIO ----------

  function pintarInicio() {
    estado.borrador = null;
    const registros = Store.registrosDelDia(estado.fecha);

    const botones = PLANILLAS_BASE.map((p) =>
      '<button class="btn grande" data-act="nueva" data-id="' + esc(p.id) + '">' +
        '<span class="codigo">' + esc(p.codigo) + '</span>' + esc(p.titulo) +
      '</button>'
    ).join('');

    const lista = registros.length
      ? registros.map(tarjetaRegistro).join('')
      : '<p class="vacio">Todavía no cargaste nada este día.</p>';

    vista.innerHTML =
      '<div class="barra-fecha">' +
        '<label>Día <input type="date" id="filtro-fecha" value="' + esc(estado.fecha) + '"></label>' +
        '<button class="btn chico" data-act="hoy">Hoy</button>' +
      '</div>' +
      '<h2>Cargar planilla</h2>' +
      '<div class="botones-planilla">' + botones + '</div>' +
      '<h2>Registros del día (' + registros.length + ')</h2>' + lista;
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

  // ---------- pantalla del FORMULARIO ----------

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
    if (col.tipo === 'siNo') return grupoBotones(clave, [['si', 'Sí', ''], ['no', 'No', '']], valor);
    // bienMal sí lleva colores (verde/rojo): "Mal" siempre es un problema.
    // siNo NO: en "Recargar (<50%)" el "Sí" es lo malo, y en "Disponible" es lo bueno.
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

  // ---------- acciones ----------

  function nuevoRegistro(idPlanilla) {
    const planilla = PLANILLAS_BASE.find((p) => p.id === idPlanilla);
    const nombre = Store.ultimoNombre(); // para no volver a tipear el nombre en cada planilla
    estado.borrador = {
      id: null,
      planillaId: planilla.id,
      // Copia de la estructura: el registro conserva la planilla tal como era hoy,
      // aunque más adelante se edite la planilla (ver DIAGNOSTICO.md).
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

  // ---------- eventos (un solo oyente para toda la pantalla) ----------
  // "Delegación de eventos": en vez de poner un oyente en cada botón (que se pierde cada vez
  // que redibujamos), ponemos uno en #vista y miramos qué se tocó con data-act.

  vista.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-act]');
    if (!boton) return;
    switch (boton.dataset.act) {
      case 'nueva': nuevoRegistro(boton.dataset.id); break;
      case 'editar': editarRegistro(boton.dataset.id); break;
      case 'borrar': borrar(boton.dataset.id); break;
      case 'hoy': estado.fecha = Store.hoy(); pintarInicio(); break;
      case 'opcion': tocarOpcion(boton); break;
      case 'guardar': guardar(); break;
      case 'cancelar':
        if (confirm('¿Salir sin guardar lo que cargaste?')) pintarInicio();
        break;
    }
  });

  // Cada vez que se escribe en un campo, lo copiamos al borrador (sin redibujar, para no perder el foco).
  vista.addEventListener('input', (e) => {
    const campo = e.target.dataset.campo;
    if (!campo || !estado.borrador) return;
    const b = estado.borrador;
    if (campo === 'fecha') b.fecha = e.target.value;
    else if (campo === 'observaciones') b.observaciones = e.target.value;
    else b[campo][e.target.dataset.k] = e.target.value; // cabecera, pie o datos
  });

  // Selector de día de la pantalla de inicio.
  vista.addEventListener('change', (e) => {
    if (e.target.id === 'filtro-fecha' && e.target.value) {
      estado.fecha = e.target.value;
      pintarInicio();
    }
  });

  pintarInicio();
})();
