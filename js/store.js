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

  function vacio() {
    return { ultimoNombre: '', registros: [] };
  }

  function cargar() {
    let texto = null;
    try {
      texto = localStorage.getItem(CLAVE);
      return texto ? JSON.parse(texto) : vacio();
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

  function ultimoNombre() {
    return datos.ultimoNombre || '';
  }

  return { hoy, registrosDelDia, obtener, guardarRegistro, borrar, ultimoNombre };
})();
