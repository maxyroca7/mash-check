# DIAGNÓSTICO — mash-check (versión vieja con Supabase)

Carpeta analizada: `/home/maxazor/Documentos/miSoftware/mash-check` (no se tocó nada ahí).
Fecha del análisis: 30/09/2026.

> Aviso de honestidad: no pude abrir la app online ni ver la consola de tu proyecto
> de Supabase. Lo que sigue son **causas probables sacadas del código**, no una
> falla confirmada. Lo que sí pude comprobar lo marco como "verificado".

---

## 1. Qué hacía la versión vieja

Era un **SaaS multi-fábrica** para digitalizar planillas de Seguridad e Higiene (MASH):

| Función | Archivo | Para qué |
|---|---|---|
| Registro / login con email y contraseña | `index.html`, `auth.js` | Cada usuario entraba a su organización |
| Organizaciones y roles (admin / supervisor / operario) | `admin.html`, `sql/01..04` | Varias fábricas en una misma base |
| Listado de planillas | `planillas.html` | Elegir qué planilla completar |
| Completar planilla (checklist, autoguardado, **firma dibujada**) | `completar.html`, `forms-render.js`, `signature.js` | Cargar el control |
| Historial de registros | `historial.html` | Ver lo cargado antes |
| Dashboard con KPIs y alertas | `dashboard.html` | Resumen |
| Reportes con gráficos (Chart.js) | `reportes.html` | Indicadores |
| Constructor visual de planillas (drag & drop) | `constructor.html` | Crear planillas nuevas |
| Importar planillas desde Excel, duplicar, eliminar | `planillas.html` | Administración |
| Exportar a PDF | `pdf.js` | Imprimir/compartir |
| PWA + cola offline con IndexedDB y Background Sync | `service-worker.js`, `sync.js` | Funcionar sin señal |
| Auditoría de cambios | `sql/02-rls.sql` | Quién cambió qué |

**Las 3 planillas reales que traía de fábrica** (esto es lo único realmente útil para rescatar):

1. **6114 REG-04 — Control de Botiquines** (mensual): 16 elementos (guantes, gasas, yodo,
   alcohol, ibuprofeno…) × 5 puestos (Puesto Uno, Producción, Calidad, Cocina, Logística A4),
   cada celda Sí/No + observaciones. Firma del responsable.
2. **6114 REG-09 — Control de Tableros Eléctricos**: cabecera (fecha, sector, área,
   identificación, tipo) + 3 secciones: estado general, protecciones (Bien/Mal + acción +
   responsable) y trabajos a realizar (tilde "realizado"). Pie: controló, fecha, firma.
3. **6114 REG-05 — Control de Absorbentes**: por ítem, Disponible / Recargar (<50 %) /
   Posee cartelería / Tapa / Limpio + observaciones. Firma del responsable.

Tamaño: ~25 archivos, 5 scripts SQL, 8 pantallas, 3 librerías de CDN además de Supabase.
Para una sola persona que carga datos desde su celular, es mucho más de lo necesario.

---

## 2. Por qué probablemente no funcionaba online

### Idea clave para entender todo esto

Una app de **solo HTML/JS** (estática) vive en un hosting que solo "reparte archivos".
Si además depende de **otro servicio** (Supabase) para loguearte y guardar, entonces
tienen que estar bien *a la vez*: el hosting, el servicio, las claves, las reglas de
seguridad y las URLs. Si falla **una sola**, la app "no anda" y casi nunca dice por qué.
Tu versión vieja tenía **cinco** piezas que tenían que coincidir.

### Causas probables (de más a menos sospechosa)

**1. Dependencia de que Supabase esté configurado a mano, en 5 pasos que no se ven en el código.**
`README.md` pide correr 4–5 scripts SQL *en orden* y **desactivar "Confirm email"** en el
panel de Supabase. Si falta uno, `auth.js` falla:
- Con "Confirm email" prendido, `signUp` no devuelve sesión → la app muestra "revisá tu
  correo" y nunca entra. Además el mail de confirmación apunta por defecto a `localhost`
  (*Site URL / Redirect URLs* sin configurar) → el link del mail no abre tu app publicada.
- Si `fn_registrar_organizacion_admin` (la función del servidor) no existe, el registro queda
  "a medias": hay usuario pero no organización. El historial git lo confirma: hay un commit
  entero (`fix(auth): completar registros a medias`) para parchear justo eso.

**2. RLS (Row Level Security) — reglas de seguridad de la base.**
`02-rls.sql` hace que cada consulta solo vea filas de *tu* organización. Si una política
tiene un error, o el usuario no tiene fila en `users`, **la consulta no da error: devuelve
vacío**. Se ve como "no hay planillas / no carga nada". También hubo que reescribir
`02-rls.sql` para poder re-ejecutarlo (`fix(rls): hacer idempotente`), otra señal de
que costó dejarlo bien.

**3. Rutas absolutas (`/dashboard`, `/planillas`, `/assets/...`).** *(verificado)*
Están en `auth.js`, en todos los `<a href="/...">`, en `manifest.json`
(`"start_url": "/dashboard"`, `"scope": "/"`, íconos `/assets/...`) y en el
`APP_SHELL` del service worker (`'/'`, `'/offline'`...).
- Una ruta que empieza con `/` significa "desde la raíz del **dominio**". En Cloudflare Pages
  tu app está en la raíz y funciona. En **GitHub Pages** tu app vive en
  `maxyroca7.github.io/mash-check/`, y `/dashboard` apunta a `maxyroca7.github.io/dashboard`
  → **404**. Por eso en esta versión nueva todo va **relativo** (`./dashboard.html`).
- Además usabas rutas *sin* `.html` (`/dashboard`), que solo funcionan si el hosting las
  traduce. Cloudflare lo hace con un redirect 308, y ese redirect rompía el service worker
  (commit `fix(pwa): ERR_FAILED en Cloudflare Pages por respuestas redirigidas del SW`).

**4. Todo depende de un CDN y de internet para *arrancar*.** *(verificado)*
`index.html:261` carga `supabase-js` desde `cdn.jsdelivr.net`. Si el CDN no responde
(wifi de planta con filtros, sin señal), `supabase` queda sin definir, `window.mashSupabase`
no se crea y `protegerPagina()` hace `location.replace('/')` → te manda al login una y otra
vez. Una app "offline" que necesita internet para iniciar sesión no es offline.

**5. Sesión/JWT y reloj del equipo.**
`auth.js` tiene mucho código para el error *"JWT issued at future"*: pasa si la hora del
celular está corrida. Es un síntoma de que el login dependía de tokens con fecha, otra
fuente de fallas que una app sin login no tiene.

**6. Cuenta gratuita de Supabase.**
Los proyectos gratuitos se **pausan solos tras ~7 días sin uso**. Si pasó, toda la app
falla hasta reactivarlo manualmente en el panel.

### Lo que SÍ estaba bien (verificado)

- La clave `anon` es válida: decodificada, es `role: anon`, vence en 2036. No era una
  clave vencida ni la `service_role`. (La `anon` puede estar en el frontend; es pública
  por diseño. Lo que protege los datos son las reglas RLS.)
- No hay archivo `.env` (el proyecto no usa npm), así que ese no era el problema.

### Conclusión simple

No es un único bug: es que el **diseño** (login + base remota + multi-organización +
rutas absolutas) tiene demasiadas piezas para una persona que solo necesita anotar en el
celular. Arreglarlo es más trabajo que rehacerlo. La versión nueva elimina de raíz las
causas 1, 2, 4, 5 y 6 (no hay servidor ni login) y la 3 (rutas relativas).

---

## 3. Propuesta de MVP

> **Importante:** tu mensaje trajo sin completar el bloque *"Qué hace mash-check en
> planta"*. Armé esta propuesta **suponiendo** que la app nueva sigue haciendo lo mismo
> que la vieja (las 3 planillas MASH). Corregime lo que no sea así (ver preguntas abajo).

### MVP — lo mínimo para usarla mañana

1. **Pantalla principal**: 3 botones grandes, uno por planilla (Botiquines / Tableros
   eléctricos / Absorbentes) + botón "Reporte del día".
2. **Planillas como datos, no como código**: arrancan con las 3 planillas de fábrica
   (`planillas-base.js`) y vos podés **crear, editar, duplicar y borrar** planillas
   desde un **constructor simple** (ver abajo).
3. **Formulario de carga**, una pregunta por pantalla o pocos ítems a la vez, botones
   grandes: ✔ Bien / ✘ Mal (o Sí/No según la planilla) + observación opcional.
   Cabecera: fecha (hoy por defecto) y "Revisó" (se recuerda el último nombre).
4. **Guardado local** (IndexedDB) en el celular.
5. **Lista de registros del día**, con **editar** y **borrar**.
6. **Reporte del día** imprimible/compartible (A4 vía imprimir → PDF), con los ✘ marcados
   bien visibles arriba, como en controlLinea.
7. **Backup**: exportar e importar JSON.
8. **PWA** sin conexión (manifest + service worker versionado) y publicación en
   GitHub Pages `/mash-check/`.

### Para después (NO entra en el MVP)

| Cosa | Por qué se deja |
|---|---|
| Firma dibujada en pantalla | Es lo más pesado de la planilla vieja. En el MVP alcanza con "Revisó: nombre". Si la planilla en papel exige firma, la firmás en el impreso. |
| Importar planillas desde Excel y arrastrar-y-soltar para ordenar ítems | El constructor entra en el MVP, pero en versión simple (botones ▲▼ para ordenar). |
| Dashboard, KPIs y gráficos | Es "más que un MVP". Si querés un gráfico, es un agregado chico al reporte después. |
| Historial por mes / semana, búsquedas | El MVP muestra solo "el día". |
| Fotos adjuntas | Pesan mucho en IndexedDB; complican el backup. |
| Multiusuario, roles, auditoría, organizaciones | Eran todo el motivo de Supabase y la usás vos solo. |
| Alertas de planillas vencidas (mensual/semanal) | Útil, pero es una función extra. |
| Instalar con aviso "agregar a pantalla de inicio" | El navegador ya lo ofrece solo. |

### Constructor de planillas (agregado a pedido tuyo)

Versión simple: una planilla = nombre + código + lista de ítems + columnas elegidas entre
unos pocos tipos (Sí/No, Bien/Mal, tilde, texto). Pantallas: lista de planillas → editar /
**duplicar** (copia con " (copia)" en el nombre; "clonar" y "duplicar" son lo mismo, hago un
solo botón) / borrar. Ordenar ítems con ▲▼.

**Decisión de diseño importante (para aprender):** si editás una planilla *después* de haber
cargado registros, los registros viejos no pueden cambiar. Por eso **cada registro guarda
una copia de la estructura de la planilla** tal como estaba ese día. Así el reporte de ayer
sale igual aunque hoy agregues o saques ítems. Es la misma razón por la que la vieja tenía
`schema_json` por registro.

### ⚠️ Avisos de "esto ya es más que un MVP"

- El **constructor** (lo incluí porque lo pediste): suma una pantalla más y vuelve más
  compleja la carga. Lo hago en la **Fase 1b**, *después* de probar la carga con las 3
  planillas base, para no frenarte la prueba en planta.
- La **firma dibujada** y el **gráfico** si los pedís desde el día 1.
- **Planilla de Botiquines** tiene 16 ítems × 5 puestos = **80 celdas**. Con guantes es
  incómodo. Propuesta: cargarla **un puesto por vez** (16 ítems) y que el reporte arme
  la tabla completa. Si te sirve así, lo hago; si no, la dejamos como grilla.

---

## 4. Preguntas que necesito que me respondas para aprobar la Fase 0

1. **¿La app nueva controla las mismas 3 planillas (botiquines, tableros eléctricos,
   absorbentes)?** ¿O hay otra cosa / más planillas / menos?
2. **¿Qué reporte necesitás al final del día?** (¿tabla de ítems con ✘ resaltados? ¿solo
   las no conformidades? ¿una página por planilla?)
3. **¿Con qué frecuencia las cargás?** (la vieja decía "mensual" para botiquines): ¿"del
   día" tiene sentido o conviene "del mes"?
4. **¿Firma:** alcanza con el nombre escrito en el MVP?
5. **Carpeta del proyecto nuevo:** la vieja se llama `mash-check` y está en
   `miSoftware/`. Armé esta carpeta como `mash-check-nuevo` para no pisarla. ¿La dejamos
   así hasta publicar (el repo en GitHub se llamaría `mash-check` igual) o preferís
   renombrar la vieja a `mash-check-versionVieja`, como hiciste con `qualityos`?
6. **¿Necesitás importar planillas desde Excel** (la vieja lo tenía) o alcanza con
   armarlas en el constructor?
