/*
 * store.js — Capa de datos: lo ÚNICO que sabe dónde y cómo se guardan los registros.
 *
 * POR QUÉ localStorage Y NO IndexedDB: guardamos solo texto (sin fotos) y pocos registros por
 * día, así que localStorage alcanza y es síncrono (mucho más simple de entender y de depurar).
 * Como todo el acceso pasa por este archivo, si algún día hace falta IndexedDB se cambia
 * ACÁ y el resto de la app no se entera.
 *
 * Forma de lo guardado (clave 'mashCheck.v1'):
 * {
 *   ultimoNombre: 'Maxi',
 *   planillas: [ ...planillas editables (forma documentada en planillas-base.js)... ],
 *   registros: [{
 *     id, fecha: 'AAAA-MM-DD', planillaId,
 *     planilla: { ...copia de la estructura de la planilla ESE día... },
 *     cabecera: { puesto: '...', reviso: '...' },
 *     datos: { 's1.r1.c1': 'si', ... },   // clave = seccion.fila.columna
 *     observaciones: '', pie: { controlo: '...' },
 *     creado, modificado
 *   }]
 * }
 *
 * Si cambiás la forma de los datos: subí la clave a 'mashCheck.v2' y migrá desde v1 en cargar().
 */
const Store = (() => {
  const CLAVE = 'mashCheck.v1';
  let datos = cargar();
  persistir(); // fija las planillas de fábrica la primera vez (ver cargar)

  function vacio() {
    return { ultimoNombre: '', registros: [], planillas: copiar(PLANILLAS_BASE) };
  }

  function copiar(objeto) {
    return JSON.parse(JSON.stringify(objeto));
  }

  function cargar() {
    let texto = null;
    try {
      texto = localStorage.getItem(CLAVE);
      if (!texto) return vacio();
      const guardado = JSON.parse(texto);
      // Datos de la Fase 1 no tenían planillas: se las agregamos sin tocar los registros.
      // Desde ahora las planillas viven en el Store (no en PLANILLAS_BASE) porque el usuario
      // las puede editar; PLANILLAS_BASE queda solo como "punto de partida de fábrica".
      if (!Array.isArray(guardado.planillas)) guardado.planillas = copiar(PLANILLAS_BASE);
      return guardado;
    } catch (error) {
      // Si el JSON está dañado NO arrancamos en blanco sin más: el próximo guardado pisaría
      // los datos viejos. Los apartamos en otra clave para poder recuperarlos a mano.
      try { if (texto) localStorage.setItem(CLAVE + '.corrupto', texto); } catch (e) { /* sin espacio */ }
      return vacio();
    }
  }

  // Devuelve false si no pudo guardar (típico: el almacenamiento del navegador está lleno).
  function persistir() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Fecha de HOY en formato AAAA-MM-DD según la hora LOCAL del celular.
  // No usamos toISOString(): da la fecha en UTC, y en Argentina (UTC-3) pasadas las 21:00 ya
  // devolvería "mañana". Como trabajás turno tarde, eso te cargaría registros en el día equivocado.
  function hoy() {
    const d = new Date();
    const dos = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  function registrosDelDia(fecha) {
    return datos.registros
      .filter((r) => r.fecha === fecha)
      .sort((a, b) => a.creado.localeCompare(b.creado));
  }

  function obtener(id) {
    return datos.registros.find((r) => r.id === id) || null;
  }

  // Alta si no tiene id, modificación si ya existe. Devuelve true/false según haya podido guardar.
  function guardarRegistro(registro) {
    const antes = JSON.stringify(datos);
    const ahora = new Date().toISOString();
    const indice = datos.registros.findIndex((r) => r.id === registro.id);

    if (indice >= 0) {
      datos.registros[indice] = { ...registro, creado: datos.registros[indice].creado, modificado: ahora };
    } else {
      // Id propio (hora + azar): no necesitamos nada más para distinguir registros en un solo celular.
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      datos.registros.push({ ...registro, id: id, creado: ahora, modificado: ahora });
    }

    const nombre = registro.cabecera.reviso || (registro.pie && registro.pie.controlo);
    if (nombre) datos.ultimoNombre = nombre;

    if (persistir()) return true;
    datos = JSON.parse(antes); // no se pudo guardar: volvemos atrás para que memoria y disco coincidan
    return false;
  }

  function borrar(id) {
    datos.registros = datos.registros.filter((r) => r.id !== id);
    return persistir();
  }

  // ---------- planillas ----------

  function planillas() {
    return datos.planillas;
  }

  function planilla(id) {
    return datos.planillas.find((p) => p.id === id) || null;
  }

  // Alta si no tiene id, modificación si ya existe. Editar una planilla NO toca los registros ya
  // cargados: cada uno guarda su propia copia de la estructura.
  function guardarPlanilla(nueva) {
    const antes = JSON.stringify(datos);
    const indice = datos.planillas.findIndex((p) => p.id === nueva.id);
    if (indice >= 0) {
      datos.planillas[indice] = nueva;
    } else {
      nueva.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      datos.planillas.push(nueva);
    }
    if (persistir()) return true;
    datos = JSON.parse(antes);
    return false;
  }

  function borrarPlanilla(id) {
    datos.planillas = datos.planillas.filter((p) => p.id !== id);
    return persistir();
  }

  // Vuelve a agregar las planillas de fábrica que falten (no pisa las que ya existen).
  function restaurarDeFabrica() {
    PLANILLAS_BASE.forEach((base) => {
      if (!planilla(base.id)) datos.planillas.push(copiar(base));
    });
    return persistir();
  }

  function ultimoNombre() {
    return datos.ultimoNombre || '';
  }

  return {
    hoy, registrosDelDia, obtener, guardarRegistro, borrar, ultimoNombre,
    planillas, planilla, guardarPlanilla, borrarPlanilla, restaurarDeFabrica
  };
})();
