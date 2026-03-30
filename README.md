# OPENAUDITOR

La alternativa open source a iAuditor para crear plantillas, ejecutar inspecciones, trabajar offline, sincronizar cuando haga falta y exportar reportes sin licencias por usuario.

OPENAUDITOR está pensado para equipos que quieren:

- empezar gratis
- tener sus datos en su propio entorno
- inspeccionar desde PC, tablet o celular
- trabajar offline cuando no hay conectividad
- adaptar la herramienta a su realidad
- evitar una nube cerrada y costosa

---

## 1. Qué hace OPENAUDITOR

Hoy OPENAUDITOR ya permite:

- crear plantillas con páginas, secciones y preguntas
- usar portada, logo e imagen de portada
- definir lógica condicional
- usar scoring
- cargar notas, fotos, acciones correctivas y firma
- probar plantillas antes de publicarlas
- ejecutar inspecciones desde navegador
- guardar borradores locales
- exportar `PDF`, `XLSX`, `CSV` y `JSON`
- exportar HTML standalone para uso offline
- importar inspecciones standalone después
- sincronizar opcionalmente a `Apps Script`, `webhooks`, `PocketBase`, `Supabase` y otros receptores
- importar plantillas reales desde un catálogo comunitario

En una frase:

> Diseñás la plantilla, la probás, inspeccionás en campo, exportás reportes y seguís siendo dueño del sistema.

---

## 2. Filosofía del proyecto

OPENAUDITOR va en dirección contraria a una herramienta cerrada:

- `open source`
- `local-first`
- `offline-friendly`
- `sin login ni roles internos obligatorios`
- `sin dependencia obligatoria de nube`
- `portable`
- `hackeable`

La seguridad perimetral, si el equipo la necesita, se resuelve mejor con red local, VPN, reverse proxy o HTTPS, no con fricción interna innecesaria.

---

## 3. Casos de uso ideales

OPENAUDITOR encaja muy bien en:

- seguridad e higiene
- SST / HSE
- mantenimiento
- retail
- operaciones
- auditorías internas
- inspecciones preoperacionales
- control de contratistas
- chequeos legales internos
- listas operativas en campo

---

## 4. Stack técnico

- `Node.js`
- `Express`
- `better-sqlite3`
- `HTML + CSS + JavaScript vanilla`
- `Puppeteer` para PDF
- `ExcelJS` para Excel
- `Multer` para uploads
- `qrcode` para QR
- `Archiver` / `adm-zip` para backups y packs

Además:

- CSP endurecida con `script-src-attr 'none'`
- pantallas principales sin handlers inline
- modo abierto por diseño
- despliegue simple por `Node`, `PM2` o `Docker`

---

## 5. Requisitos

### Requisitos mínimos

- `Node.js 18` o superior
- `npm`
- navegador moderno

### Recomendado

- `Node.js 20`
- Git
- al menos `2 GB` libres para trabajar cómodo con adjuntos y PDFs

---

## 6. Instalación desde cero en Windows

Si querés el camino más simple posible, seguí estos pasos exactos.

### Paso 1. Instalar Node.js

1. Abrí `https://nodejs.org/`
2. Descargá la versión `LTS`
3. Instalá con el asistente normal
4. Cerrá y volvé a abrir PowerShell

### Paso 2. Verificar Node y npm

En PowerShell:

```powershell
node -v
npm -v
```

Qué deberías ver:

- una versión de Node, por ejemplo `v18.x` o `v20.x`
- una versión de npm

Si Windows dice que `node` no existe:

- cerrá la terminal y abrila de nuevo
- si sigue igual, reiniciá la PC

### Paso 3. Instalar Git

1. Abrí `https://git-scm.com/download/win`
2. Instalá Git
3. Cerrá y abrí PowerShell de nuevo

Verificá:

```powershell
git --version
```

### Paso 4. Clonar el proyecto

```powershell
cd "C:\Users\TU_USUARIO\Documents"
git clone https://github.com/apu242007/Auditor Libre.git
cd "Auditor Libre"
```

Si ya tenés el proyecto descargado en otra ruta:

```powershell
cd "RUTA\A\OPENAUDITOR"
```

### Paso 5. Instalar dependencias

```powershell
npm install
```

Qué deberías ver:

- descarga de paquetes
- actualización de `node_modules`
- fin del proceso sin error fatal

### Paso 6. Levantar la app

```powershell
npm start
```

Qué deberías ver:

- el servidor iniciando
- mensajes del tipo `Server started successfully`
- referencia al puerto `3001`

### Paso 7. Abrir la app

Abrí:

```text
http://localhost:3001
```

Qué deberías ver:

- dashboard principal
- plantillas
- inspecciones recientes
- accesos a catálogo, configuración y acciones

### Paso 8. Verificar que la app está viva

Abrí estas rutas:

```text
http://localhost:3001
http://localhost:3001/catalog
http://localhost:3001/settings
```

Qué deberías ver:

- dashboard
- catálogo comunitario
- pantalla de configuración

### Paso 9. Verificar que el modo abierto está activo

En otra terminal:

```powershell
curl http://localhost:3001/api/auth/status
```

Resultado esperado:

```json
{"securityRequired":false,"authenticated":true,"mode":"open"}
```

---

## 7. Instalación rápida para quien ya usa Node

```bash
git clone https://github.com/apu242007/Auditor Libre.git
cd "Auditor Libre"
npm install
npm start
```

Abrí:

```text
http://localhost:3001
```

---

## 8. Scripts disponibles

```bash
npm start
npm run start:prod
npm run check:prod
npm run dev
npm test
npm run test:coverage
npm run test:watch
npm run lint
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
npm run pm2:logs
```

### Qué hace cada script

- `npm start`: arranque normal
- `npm run start:prod`: arranque en modo producción
- `npm run check:prod`: chequeo post-deploy
- `npm run dev`: modo desarrollo con recarga
- `npm test`: tests automáticos
- `npm run test:coverage`: tests con cobertura
- `npm run test:watch`: tests en modo watch
- `npm run lint`: validación estática
- `npm run pm2:start`: arranque bajo PM2
- `npm run pm2:stop`: detener PM2
- `npm run pm2:restart`: reinicio PM2
- `npm run pm2:logs`: logs PM2

---

## 9. Primer uso: de cero a tu primer PDF

Esta es la secuencia ideal para entender el producto completo.

### Paso 1. Entrar al dashboard

Abrí:

```text
http://localhost:3001
```

Vas a ver:

- plantillas
- inspecciones recientes
- catálogo comunitario
- importación JSON
- accesos a configuración, acciones y comparación

### Paso 2. Importar una plantilla real del catálogo

Tenés dos caminos:

1. desde `Importar desde JSON`
2. desde `/catalog`

Ruta directa:

```text
http://localhost:3001/catalog
```

Qué hacer:

1. entrá a `Catálogo`
2. elegí una plantilla real, por ejemplo:
   - `Checklist Legal Ley 19.587`
   - `Checklist de Salidas y Emergencia`
   - `Checklist SST para Oficinas`
3. hacé clic en `Importar en mi espacio`

Qué debería pasar:

- se crea un borrador
- se abre el editor

### Paso 3. Editar la plantilla

La pantalla del editor queda en:

```text
/editor/:id
```

Ahí podés:

- cambiar nombre y descripción
- agregar páginas
- agregar secciones
- agregar preguntas
- marcar preguntas requeridas
- activar nota, foto y acción
- definir scoring
- configurar lógica condicional
- cargar logo
- usar portada
- ver preview en tiempo real
- probar sin publicar

### Paso 4. Probar antes de publicar

Usá el botón `Probar`.

Eso crea una inspección de test usando el borrador actual, sin necesidad de publicar.

Qué deberías ver:

- una inspección marcada como `Prueba`
- el flujo real del inspector funcionando

### Paso 5. Volver y publicar

Cuando la plantilla ya está bien:

1. volvé al editor
2. hacé clic en `Publicar`

Qué debería pasar:

- la plantilla queda activa
- ya aparece lista para iniciar inspecciones reales

### Paso 6. Iniciar una inspección real

Desde dashboard:

- iniciar una inspección normal

O por URL/QR:

```text
/inspect/:templateId
```

### Paso 7. Completar la inspección

En el inspector podés:

- responder preguntas
- marcar `Sí / No / N/A`
- agregar notas
- sacar fotos
- cargar acciones correctivas
- usar secciones repetibles
- ver progreso por página
- saltar al siguiente pendiente

### Paso 8. Finalizar la inspección

Usá:

```text
Finalizar inspección
```

Qué debería pasar:

- la inspección cambia a completada
- queda lista para exportar

### Paso 9. Exportar el primer PDF

Abrí la inspección terminada y exportá:

- `PDF`
- `PDF de hallazgos`

Si la plantilla tiene portada activada:

- el PDF incluye portada
- incluye todas las páginas
- incluye anexos cuando corresponda

---

## 10. Trabajo offline

OPENAUDITOR tiene tres niveles de operación offline.

### Modo 1. Borrador local en navegador

Mientras inspeccionás en el navegador:

- las respuestas se van guardando
- si perdés conexión, el flujo no se corta de inmediato

### Modo 2. HTML standalone

Podés exportar una plantilla como HTML autónomo para usar fuera de la app principal.

Ese HTML:

- funciona sin depender del dashboard
- puede guardar localmente
- puede exportar JSON
- puede sincronizar cuando vuelva Internet

### Modo 3. Importación posterior

Si el operario completó datos fuera de la instancia principal:

- exporta JSON
- luego lo importás en OPENAUDITOR

---

## 11. Sync opcional

OPENAUDITOR no te obliga a usar una nube, pero permite sumar sync opcional.

Destinos soportados conceptualmente:

- `Apps Script / Google Sheets`
- `Webhook JSON`
- `n8n`
- `PocketBase`
- `Supabase`
- `OPENAUDITOR remoto`

### Estrategia recomendada

#### Para empezar gratis

- OPENAUDITOR local
- HTML standalone
- Apps Script o webhook

#### Para crecer

- OPENAUDITOR como nodo de administración
- PocketBase o Supabase como capa remota opcional

### Google Sheets

La estrategia actual recomendada es:

- una hoja por plantilla
- columnas automáticas según la plantilla
- ampliación automática si la plantilla cambia

---

## 12. Catálogo comunitario

La app trae un catálogo de plantillas reales listas para importar.

Ruta:

```text
http://localhost:3001/catalog
```

Hoy incluye líneas como:

- seguridad
- mantenimiento
- retail
- calidad
- vehículos
- construcción

Y además ya está orientado a marcos argentinos como:

- Ley 19.587
- Decreto 351/79
- focos legales de SST

---

## 13. Producción paso a paso

OPENAUDITOR ya quedó preparado para producción con estas decisiones:

- `SQLite + una sola instancia`
- `HOST` configurable
- `Docker` escuchando en `0.0.0.0`
- `PM2` en `fork`, no en `cluster`
- `healthcheck` por `readyz`
- sin notificaciones de escritorio en `production`

### Opción A. Producción simple en la misma máquina

#### Paso 1. Crear archivo de entorno

```powershell
copy .env.production.example .env
```

#### Paso 2. Editar variables

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATA_DIR=C:\OPENAUDITOR\data
LOG_LEVEL=info
SECURE_COOKIES=false
```

#### Paso 3. Instalar dependencias

```powershell
npm install
```

#### Paso 4. Arrancar

```powershell
npm run start:prod
```

#### Paso 5. Verificar

```powershell
curl http://127.0.0.1:3001/readyz
curl http://127.0.0.1:3001/health
npm run check:prod
```

### Opción B. Producción con PM2

#### Paso 1. Crear `.env`

```powershell
copy .env.production.example .env
```

#### Paso 2. Instalar dependencias

```powershell
npm install
```

#### Paso 3. Arrancar con PM2

```powershell
npm run pm2:start
```

#### Paso 4. Operación diaria

```powershell
npm run pm2:restart
npm run pm2:logs
```

Notas:

- PM2 quedó configurado con `1` instancia
- no uses `cluster` con SQLite

### Opción C. Producción con Docker

#### Paso 1. Crear `.env`

```bash
cp .env.production.example .env
```

#### Paso 2. Ajustar variables

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATA_DIR=/data
SECURE_COOKIES=false
LOG_LEVEL=info
```

#### Paso 3. Construir y levantar

```bash
docker compose up -d --build
```

#### Paso 4. Ver estado

```bash
docker compose ps
docker compose logs -f app
```

#### Paso 5. Verificar

```bash
curl http://127.0.0.1:3001/readyz
curl http://127.0.0.1:3001/health
npm run check:prod
```

### Opción D. Producción detrás de reverse proxy

Si la vas a publicar fuera de tu LAN:

1. poné OPENAUDITOR detrás de `Nginx`, `Caddy` o `Traefik`
2. activá HTTPS real
3. recién ahí usá:

```env
SECURE_COOKIES=true
```

Ejemplo base:

- [nginx.conf.example](./nginx.conf.example)

### Checklist de salida a producción

1. definir `DATA_DIR` persistente
2. verificar `readyz`
3. verificar `health`
4. probar `/`, `/catalog`, `/settings`
5. crear una plantilla de prueba
6. ejecutar una inspección de prueba
7. exportar un PDF
8. probar backup
9. si hay proxy y HTTPS, activar `SECURE_COOKIES=true`

### Qué no hacer

- no usar PM2 en `cluster`
- no correr múltiples procesos contra la misma base SQLite
- no publicar la app a Internet sin proxy y HTTPS
- no depender de `localhost` si el objetivo es acceso por red

---

## 14. Rutas útiles

### Rutas principales

```text
/
/catalog
/settings
/about
/actions
/compare
/search
```

### Rutas funcionales

```text
/editor/:id
/inspect/:templateId
/inspector/:inspectionId
```

### Rutas de salud

```text
/readyz
/health
```

### Rutas API útiles

```text
/api/auth/status
/api/templates/examples
/api/config
```

---

## 15. Estructura del proyecto

```text
OPENAUDITOR/
├─ public/
├─ routes/
├─ lib/
├─ templates/catalog/
├─ docs/
├─ plugins/
├─ schemas/
├─ scripts/
├─ server.js
├─ standalone_inspection.js
├─ pdf_report.js
├─ package.json
├─ docker-compose.yml
├─ Dockerfile
└─ ecosystem.config.js
```

### Qué hay en cada carpeta

- `public/`: UI estática y pantallas principales
- `routes/`: endpoints Express
- `lib/`: utilidades internas
- `templates/catalog/`: plantillas comunitarias importables
- `docs/`: documentación extendida
- `plugins/`: conectores y ejemplos
- `schemas/`: ejemplos de payloads y estructuras
- `scripts/`: helpers operativos

---

## 16. Backups

Desde la app:

- podés exportar backup completo
- podés restaurar backup

Incluye:

- configuración
- plantillas
- inspecciones
- biblioteca
- uploads

En producción, además conviene:

- respaldar `DATA_DIR`
- respaldar volúmenes Docker si usás contenedores

---

## 17. Troubleshooting paso a paso

### La app no abre

1. verificá Node:

```bash
node -v
npm -v
```

2. instalá dependencias:

```bash
npm install
```

3. levantá:

```bash
npm start
```

### El puerto 3001 está ocupado

En Windows:

```powershell
Get-NetTCPConnection -LocalPort 3001
Get-Process -Id <PID>
```

Si necesitás cerrarlo:

```powershell
Stop-Process -Id <PID> -Force
```

### El celular no abre `localhost`

`localhost` existe solo dentro de la misma máquina.

Soluciones:

- usar la IP local de la PC
- usar QR en LAN
- usar HTML standalone
- desplegar con `HOST=0.0.0.0`

### `npm test` no corría en Windows

Eso ya quedó corregido usando `cross-env`.

Probalo así:

```powershell
npm test
```

### `health` devuelve `degraded`

Eso significa que la app vive, pero detectó un problema operativo, por ejemplo:

- poco espacio en disco

La ruta sigue siendo útil para producción porque te avisa antes de que la instancia falle de verdad.

### El sync falla

No perdés el trabajo si:

- guardaste borrador local
- exportaste JSON
- reenviás luego al destino remoto

---

## 18. Estado actual de calidad

### Validado recientemente

- arranque en modo producción
- escucha en `0.0.0.0`
- `readyz`
- `health`
- dashboard principal
- catálogo
- settings
- chequeo post-deploy con `npm run check:prod`

### Pendiente técnico conocido

- todavía hay deuda legacy de `lint` en varios archivos viejos
- todavía conviene una pasada final de limpieza textual/visual en algunas pantallas secundarias

Eso no bloquea el uso ni el deploy, pero sí es una línea de mejora real.

---

## 19. Cómo contribuir

1. leé:

- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `ROADMAP.md`

2. creá rama:

```bash
git checkout -b mi-mejora
```

3. instalá:

```bash
npm install
```

4. probá:

```bash
npm test
npm run check:prod
```

---

## 20. Roadmap natural

Las líneas de crecimiento más fuertes son:

- PWA instalable real
- más packs legales por país
- más plantillas comunitarias
- más conectores oficiales
- mejor analítica
- mejor documentación para integradores

---

## 21. Resumen rápido

Con OPENAUDITOR podés:

1. crear una plantilla
2. probarla
3. publicarla
4. inspeccionar online u offline
5. sincronizar si querés
6. exportar reportes
7. seguir siendo dueño de todo

---

## 22. Si este proyecto te sirve

Las mejores formas de ayudar son:

- usarlo
- adaptarlo
- compartirlo
- abrir issues
- aportar plantillas
- sumar conectores
- mejorarlo para tu rubro y devolver esas mejoras

La idea no es solo competir con una herramienta paga.

La idea es que cualquier equipo pueda construir su propia plataforma de inspección libre.
