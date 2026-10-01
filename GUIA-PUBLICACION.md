# Guía: publicar y actualizar MASH Check en GitHub Pages

Dirección de la app (el repo hoy está en `quality-systems/mash-check`):
**https://quality-systems.github.io/mash-check/**

> Si GitHub te muestra otra dirección en *Settings → Pages*, usá esa. Todas las rutas de la
> app son relativas, así que funciona igual en cualquier dirección.

---

## A. Primera publicación (o subir todo de nuevo)

### Archivos que tienen que estar en el repo
```
index.html
manifest.json
sw.js
css/styles.css
js/planillas-base.js
js/store.js
js/report.js
js/app.js
icons/icon.svg
icons/icon-192.png
icons/icon-512.png
```
(`CLAUDE.md`, `DIAGNOSTICO.md` y esta guía pueden estar o no: la app no los usa.)

### Desde la web de GitHub (PC o celular)
1. Entrá a github.com → tu repo `mash-check`.
2. **Add file → Upload files**.
3. Arrastrá (PC) o elegí (celular) los archivos. **Ojo con las carpetas:**
   - En PC podés arrastrar las carpetas `css`, `js` e `icons` enteras.
   - En el celular no deja subir carpetas: subí los archivos **de a uno en cada carpeta**.
     Para que queden dentro de la carpeta, en *Add file → Create new file* escribí en el
     nombre `js/` (con la barra) y GitHub arma la carpeta; o usá la versión de escritorio
     del sitio en el navegador del celular.
4. Abajo: **Commit changes** (dejá "Commit directly to the main branch").

### Activar Pages (solo la primera vez)
1. **Settings → Pages**.
2. *Build and deployment → Source:* **Deploy from a branch**.
3. *Branch:* **main**, carpeta **/ (root)** → **Save**.
4. Esperá 1–2 minutos. Arriba aparece "Your site is live at …".

---

## B. Instalarla en el celular (una sola vez)
1. Abrí la dirección en **Chrome** (Android).
2. Menú ⋮ → **Instalar app** (o "Agregar a la pantalla principal").
3. Aparece el ícono del escudo verde. Abrila desde ahí: se ve como una app, sin barra del navegador.
4. **Probá sin señal:** abrí la app una vez con internet, poné modo avión y volvé a abrirla.
   Tiene que cargar igual y mostrar tus registros.

> En iPhone: Safari → botón Compartir → "Agregar a inicio". Funciona, pero Apple borra los
> datos de las apps web que no se usan por semanas: descargá el respaldo seguido.

---

## C. Cada vez que cambies algo (IMPORTANTE)

1. **Subí el número de `VERSION` en `sw.js`** (`'mash-check-v1'` → `'mash-check-v2'`, etc.).
   Sin esto, la copia guardada en los celulares puede quedar vieja.
2. Subí los archivos que cambiaron **y también `sw.js`** (Add file → Upload files; GitHub
   reemplaza los que ya existen con el mismo nombre).
3. Esperá 1–2 minutos a que Pages publique.
4. En el celular: abrí la app **con señal**, esperá unos 10 segundos y **cerrala y volvela a abrir**.
5. Abajo de todo de la pantalla principal tiene que decir **"Versión v2"** (o la que subiste).
   Si dice la anterior, repetí el paso 4 una vez más.

**Tus datos no se pierden al actualizar**: viven en el celular aparte de los archivos de la app.

### Antes de actualizar: respaldo
Una costumbre sana: *Copia de seguridad → Descargar respaldo* antes de subir cambios grandes.

---

## D. Si algo no anda

| Pasa esto | Probá esto |
|---|---|
| La dirección da **404** | Esperá 2 minutos. Revisá en *Settings → Pages* que esté en `main` / `(root)` y que `index.html` esté en la **raíz** del repo, no dentro de otra carpeta. |
| Pantalla en blanco o sin estilos | Casi seguro falta subir una carpeta (`css`, `js`) o quedó un archivo fuera de su carpeta. Compará con la lista de la sección A. |
| Sigue la versión vieja | Abrila con señal, esperá 10 s, cerrala del todo (sacala de apps recientes) y abrila de nuevo. Si no, Chrome → Configuración del sitio → *Borrar datos* **borra también tus registros: bajá el respaldo antes**. |
| "Instalar app" no aparece | Tiene que abrirse por `https://` (la dirección de GitHub lo es). Probá cerrar y abrir Chrome. |
| Cambié datos y "desaparecieron" | Los datos son por dirección: `localhost` y `github.io` son lugares separados. Restaurá el respaldo en la app publicada. |
| Perdí todo (cambié de celular, borré datos) | *Copia de seguridad → Restaurar respaldo* y elegí el archivo `.json` más reciente. |

---

## E. Subir con git (alternativa, desde la terminal de la PC)
```
cd ~/Documentos/miSoftware/mash-check-nuevo
git add -A
git commit -m "describí qué cambió"
git push
```
Después, los pasos 3 a 5 de la sección C.
