# MASH Check

PWA para cargar **planillas de control MASH** (Seguridad e Higiene) desde el celular y sacar un **reporte del día**. Pensada para uso personal en planta: botones grandes, pocos campos por pantalla y funcionamiento **sin conexión**.

**App publicada:** https://quality-systems.github.io/mash-check/

## Características

- **Planillas de fábrica** (como datos, no como código):
  - Control de Botiquines (6114 REG-04)
  - Control de Tableros eléctricos (6114 REG-09)
  - Control de Absorbentes (6114 REG-05)
- **Constructor de planillas**: crear, editar, duplicar y borrar planillas propias (cabecera, secciones, columnas e ítems).
- **Tipos de columna**: Sí/No, Bien/Mal, casilla de realizado y texto. En las columnas Sí/No se define qué respuesta es el problema.
- **Carga rápida**: formulario mobile first con botones de 48 px, usable con una mano y guantes.
- **Registros del día**: lista, edición y borrado. Cada registro guarda una copia de la estructura de su planilla, así los registros viejos no cambian si después se edita la planilla.
- **Reporte del día**:
  - Resalta los **ítems a atender** (respuestas problemáticas) y lista aparte las casillas sin responder.
  - **Imprimir / PDF** (A4) o **compartir** como texto desde el celular.
- **Backup JSON**: exportar e importar todos los datos (restaurar reemplaza todo y guarda lo anterior).
- **Instalable y offline** gracias al service worker.

## Tecnologías

HTML + CSS + JavaScript puro, **sin frameworks, sin npm y sin paso de build**. Scripts clásicos (sin módulos), un objeto global por archivo. Datos en `localStorage` (clave `mashCheck.v1`). Sin login ni backend.

## Estructura

```
├── index.html              # Estructura mínima: barra superior + <main id="vista">
├── manifest.json           # Datos de instalación PWA
├── sw.js                   # Service worker (red primero, caché sin conexión)
├── css/
│   └── styles.css          # Estilos mobile first e impresión
├── js/
│   ├── planillas-base.js   # Las planillas de fábrica como datos (PLANILLAS_BASE)
│   ├── store.js            # Capa de datos, constructor de planillas y respaldo (Store)
│   ├── report.js           # Reporte del día y texto para compartir (Report)
│   └── app.js              # Pantallas y eventos
├── icons/                  # Íconos de la app
├── GUIA-PUBLICACION.md     # Cómo publicar y actualizar en GitHub Pages
├── DIAGNOSTICO.md          # Análisis previo y decisiones
└── CLAUDE.md               # Contexto para agentes de IA
```

Orden de carga de los scripts: `planillas-base` → `store` → `report` → `app`.

## Uso

Para probarla en local (con `file://` el service worker no funciona):

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. En el celular, abrir la dirección publicada e instalarla desde el navegador ("Agregar a pantalla de inicio").

Flujo de trabajo:

1. Elegir la planilla y la fecha.
2. Completar cabecera e ítems → guardar.
3. Revisar los registros del día (editar o borrar si hace falta).
4. Generar el **reporte del día** → imprimir/PDF o compartir.

## Publicación

Se publica en GitHub Pages, en un subdirectorio, por eso **todas las rutas son relativas** (`./archivo`). Paso a paso en [GUIA-PUBLICACION.md](GUIA-PUBLICACION.md).

## Notas de mantenimiento

- Al cambiar cualquier archivo de la app, subir `VERSION` en `sw.js` y volver a subir también `sw.js`; si no, los celulares siguen con la versión vieja.
- Si se agrega un archivo a la app, sumarlo también a `ARCHIVOS` en `sw.js`.
- Las fechas se calculan en hora local con `Store.hoy()` (nunca `toISOString()`, que usa UTC y rompe el turno tarde).
- Los datos viven en el dispositivo: hacer backup JSON con regularidad, porque borrar los datos del navegador los elimina.
