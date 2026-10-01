# CLAUDE.md — mash-check (versión simple)

Contexto resumido para cualquier sesión futura. Detalle del análisis previo: `DIAGNOSTICO.md`.

## Quién y qué
- Usuario: Maximiliano, Checker de Calidad en Agrofacil S.A. (turno tarde). Estudia
  Desarrollo de Software (1er año): **quiere entender el código**, no solo que funcione.
- App: PWA para cargar planillas de control MASH (Seguridad e Higiene) desde el celular y
  sacar un **reporte del día**. Uso personal, una sola persona.
- **A CONFIRMAR (Fase 0 sin aprobar):** qué planillas exactamente, qué reporte y si "del día"
  es la unidad correcta. La versión vieja tenía 3: Botiquines (6114 REG-04), Tableros
  eléctricos (6114 REG-09) y Absorbentes (6114 REG-05).
- Reemplaza a la versión vieja con Supabase (`../mash-check`), que nunca funcionó online.
  No se arregla ni se reutiliza su código; solo se rescatan los datos de las planillas.

## Mismo modelo que sus otras apps
`informeCalidad` y `controlLinea` (ver `../controlLinea/AGENTS.md`): scripts clásicos, sin
módulos, un objeto global por archivo, datos en el dispositivo, reporte imprimible.

## Stack obligatorio
- HTML, CSS y JavaScript puro en archivos separados. **Sin** frameworks, Vite, npm ni build.
- PWA: `manifest.json` + service worker con `VERSION` (v1, v2…).
- Datos en el celular: IndexedDB (o localStorage si alcanza) + exportar/importar backup JSON.
- **SIN** login, Supabase, Firebase ni backend.
- Hosting: GitHub Pages en subdirectorio `/mash-check/` → **todas las rutas relativas**
  (`./archivo`, nunca `/archivo`). Funciona sin conexión una vez cargada.

## Diseño
- Mobile first, una mano y guantes: botones grandes (mín. 44–48 px), pocos campos por pantalla.
- Interfaz en español rioplatense (voseo: "Cargá", "Guardá").
- Salida final: reporte del día imprimible/compartible, como en controlLinea.

## Forma de trabajo (por fases, frenando entre cada una)
- Fase 0 Diagnóstico y MVP → **esperar aprobación**.
- Fase 1 Carga de datos con las 3 planillas base (estructura, formulario, guardado, lista del día, editar/borrar) →
  esperar prueba en el celular.
- Fase 1b Constructor simple: crear, editar, duplicar (= clonar) y borrar planillas.
  Cada registro guarda una copia de la estructura de su planilla (los viejos no cambian).
- Fase 2 Reporte del día + backup JSON → frenar.
- Fase 3 PWA y publicación + guía paso a paso para GitHub Pages (sube archivos desde la web
  de GitHub, a veces desde el celular).

## Reglas de código
- Comentarios en español explicando el **porqué**, no solo el qué.
- Funciones cortas, nombres claros en español.
- Nada de código "por las dudas" ni features no pedidas. **Avisar si un pedido excede el MVP.**
- Escapar todo texto del usuario antes de ir a `innerHTML`.
- **Cada cambio: subir `VERSION` del service worker y decirle qué archivos tiene que volver
  a subir.**

## Probar
Servir la carpeta (con `file://` el service worker no anda): `python3 -m http.server 8000`.

## Estructura actual (Fases 1, 1b y 2 hechas)
```
index.html            Estructura mínima: barra superior + <main id="vista">
css/styles.css        Estilos mobile first (botones de 48 px)
js/planillas-base.js  Las 3 planillas como DATOS (global PLANILLAS_BASE)
js/store.js           Capa de datos, localStorage clave 'mashCheck.v1' (global Store); también planillas editables y respaldo JSON
js/report.js          Arma el HTML del reporte del día y el texto para compartir (global Report, solo lectura)
js/app.js             Pantallas inicio/formulario, eventos delegados con data-act
```
Orden de carga: planillas-base → store → report → app. Aún no hay sw.js ni manifest (Fase 3).

## Decisiones tomadas (respuestas por defecto, no confirmadas explícitamente)
- Unidad del reporte: el día. Firma: nombre escrito. Sin importar Excel.
- Botiquines: el PUESTO es un campo de cabecera (un registro por puesto, 16 ítems).
- Cada registro guarda una COPIA de la planilla (`registro.planilla`), no solo su id.
- Fecha local con `Store.hoy()` (nunca `toISOString()`: UTC rompe el turno tarde).
- siNo sin colores (en "Recargar" el Sí es lo malo); bienMal en verde/rojo.
- Reporte: PDF = window.print() con @media print (A4); compartir = navigator.share con texto.
  Solo marca como problema los ítems bienMal='mal' (los Sí/No no se juzgan).
- Respaldo: JSON con {app:'mash-check', version:1, datos}. Restaurar REEMPLAZA todo (guarda lo anterior
  en 'mashCheck.v1.anterior'). Un archivo de otra app se rechaza.
