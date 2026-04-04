```text
  ____  ____  _____ _   _    _    _   _ ____ ___ _____ ___  ____
 / __ \|  _ \| ____| \ | |  / \  | | | |  _ \_ _|_   _/ _ \|  _ \
| |  | | |_) |  _| |  \| | / _ \ | | | | | | | |  | || | | | |_) |
| |__| |  __/| |___| |\  |/ ___ \| |_| | |_| | |  | || |_| |  _ <
 \____/|_|   |_____|_| \_/_/   \_\\___/|____/___| |_| \___/|_| \_\
```

[![CI/CD](https://github.com/apu242007/OPENAUDITOR/actions/workflows/ci.yml/badge.svg)](https://github.com/apu242007/OPENAUDITOR/actions/workflows/ci.yml)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-1f6f43?style=for-the-badge&logo=node.js&logoColor=white)](#7-instalacion-desde-cero-en-windows)
[![Offline First](https://img.shields.io/badge/offline-first-4f46e5?style=for-the-badge)](#13-trabajo-offline)
[![Open Source](https://img.shields.io/badge/open-source-0f172a?style=for-the-badge)](#4-filosofia-del-producto)
[![Docker Ready](https://img.shields.io/badge/docker-ready-0ea5e9?style=for-the-badge&logo=docker&logoColor=white)](#16-produccion-paso-a-paso)
[![License](https://img.shields.io/badge/license-see%20license-7c3aed?style=for-the-badge)](#29-licencia)

**La alternativa open source, offline-first y sin licencias por usuario para inspecciones, auditorías y checklists operativos.**

OPENAUDITOR te permite crear plantillas, probarlas, ejecutar inspecciones desde PC o celular, trabajar sin conexión, sincronizar cuando haga falta y exportar reportes sin depender de una nube cerrada.

Si estás buscando algo tipo iAuditor pero:

- más abierto,
- más adaptable,
- más barato,
- más portable,
- y con tus datos bajo tu control,

este proyecto está hecho para vos.

---

## -1. Por qué gana OPENAUDITOR

### Comparación rápida

| Tema | OPENAUDITOR | Herramienta cerrada típica |
|---|---|---|
| Licencias por usuario | No obligatorias | Sí, normalmente |
| Propiedad de datos | Tuya | Depende del proveedor |
| Trabajo offline | Sí | A veces, limitado |
| Personalización | Alta | Media o baja |
| Hosting propio | Sí | No siempre |
| Catálogo editable | Sí | Limitado |
| Integraciones libres | Sí | Sujetas al plan |
| Extensión por comunidad | Sí | No |

### Elevator pitch

**OPENAUDITOR convierte checklists, auditorías e inspecciones en una plataforma open source que podés instalar hoy, adaptar mañana y seguir controlando siempre.**

---

## 0. Cómo se ve

### Dashboard principal

![Dashboard principal de OPENAUDITOR](docs/images/dashboard-home.png)

### Menú para crear o importar plantillas

![Menú para crear o importar plantillas](docs/images/template-create-menu.png)

### Editor con visualizador en tiempo real

![Editor con visualizador en tiempo real](docs/images/template-editor-live-preview.png)

### Configuración abierta y destinos de sincronización

![Configuración abierta y destinos de sincronización](docs/images/settings-open-sync.png)

---

## 1. Qué es OPENAUDITOR

OPENAUDITOR es una plataforma open source para:

1. crear plantillas de inspección,
2. probarlas antes de publicarlas,
3. ejecutarlas en campo,
4. guardar evidencia,
5. generar reportes,
6. trabajar offline,
7. y sincronizar opcionalmente con servicios gratuitos o self-hosted.

### Lo que ya hace hoy

- Editor visual de plantillas.
- Páginas, secciones y preguntas.
- Portada configurable con imagen y branding.
- Logo al lado del nombre de la plantilla.
- Lógica condicional.
- Puntuación y scoring.
- Notas, fotos, acciones correctivas y firma.
- Modo `Probar` antes de publicar.
- Inspector mejorado para trabajo real en campo.
- Filtros como `Solo pendientes`, `Solo requeridas` y `Con evidencia`.
- Panel de hallazgos en vivo.
- Bloqueo de cierre si faltan requeridas.
- Exportación a `PDF`, `CSV`, `XLSX` y `JSON`.
- HTML standalone para operar offline en celular.
- Importación posterior de inspecciones offline.
- Sincronización opcional con `Apps Script`, `webhooks`, `PocketBase`, `Supabase` y otros receptores.
- Catálogo comunitario de plantillas reales.
- Plantillas orientadas a Ley 19.587 y Decreto 351/79.

### Lo que hace especial al proyecto

- `Open source` de verdad.
- `Local-first`.
- `Offline-friendly`.
- Sin login ni roles internos obligatorios.
- Sin lock-in de proveedor.
- Fácil de correr con `Node`, `PM2` o `Docker`.
- Fácil de adaptar por cualquier equipo técnico.

---

## 2. Por qué este proyecto es valioso

La mayoría de las herramientas de inspección te venden:

- licencias por usuario,
- dependencia de su nube,
- límites artificiales,
- y poca capacidad real de personalización.

OPENAUDITOR propone lo contrario:

1. empezás local y gratis,
2. usás tus propias plantillas,
3. seguís siendo dueño de tus datos,
4. escalás cuando querés,
5. y elegís si sincronizar o no.

### En una frase

**Diseñás la plantilla, la probás, inspeccionás en campo, generás evidencia, exportás reportes y seguís siendo dueño del sistema.**

---

## 3. Casos de uso ideales

OPENAUDITOR encaja muy bien en:

- seguridad e higiene,
- SST / HSE,
- mantenimiento,
- retail,
- operaciones,
- auditorías internas,
- inspecciones legales,
- control de contratistas,
- recorridas de planta,
- verificación de extintores,
- orden y limpieza,
- tableros eléctricos,
- depósitos,
- vehículos,
- andamios,
- BPM / inocuidad,
- y checklists operativos diarios.

---

## 4. Filosofía del producto

La filosofía del proyecto es simple:

1. **Tus datos son tuyos.**
2. **La herramienta tiene que funcionar aunque no haya internet.**
3. **El software no debe obligarte a usar roles o login interno si no los necesitás.**
4. **El despliegue debe ser simple.**
5. **La comunidad tiene que poder extenderlo sin pedir permiso.**

Por eso OPENAUDITOR prioriza:

- simplicidad,
- portabilidad,
- hackeabilidad,
- despliegue barato,
- documentación clara,
- y catálogos reutilizables.

---

## 5. Stack técnico

- `Node.js`
- `Express`
- `better-sqlite3`
- `HTML + CSS + JavaScript vanilla`
- `Puppeteer` para PDF
- `ExcelJS` para exportes Excel
- `Multer` para uploads
- `QRCode` para QR
- `Archiver` y `adm-zip` para backups y paquetes

### Decisiones técnicas importantes

- Base local simple con SQLite.
- CSP endurecida.
- Frontend sin frameworks pesados.
- Rutas y módulos separados.
- Modo abierto por diseño.
- Despliegue compatible con `PM2`, `Docker` y reverse proxy.

---

## 6. Requisitos

### Requisitos mínimos

- `Node.js >= 18`
- `npm`
- navegador moderno

### Recomendado

- `Node.js 20`
- `Git`
- al menos `2 GB` libres para trabajar cómodo con adjuntos, caché y PDFs

---

## 7. Instalación desde cero en Windows

Esta es la guía pensada para alguien que quiere instalarlo desde cero y validarlo paso a paso.

### Paso 1. Instalar Node.js

1. Abrí `https://nodejs.org/`
2. Descargá la versión `LTS`
3. Ejecutá el instalador
4. Aceptá las opciones normales
5. Cerrá y reabrí PowerShell

### Paso 2. Verificar Node y npm

Ejecutá:

```powershell
node -v
npm -v
```

Qué deberías ver:

- una versión de Node, por ejemplo `v20.x.x`
- una versión de npm

Si no funciona:

1. cerrá la terminal,
2. abrila de nuevo,
3. si sigue igual, reiniciá Windows.

### Paso 3. Instalar Git

1. Abrí `https://git-scm.com/download/win`
2. Instalá Git
3. Cerrá y abrí PowerShell de nuevo

Verificá:

```powershell
git --version
```

### Paso 4. Clonar el proyecto

Ubicate en una carpeta de trabajo:

```powershell
cd "C:\Users\TU_USUARIO\Documents"
```

Cloná el repo:

```powershell
git clone https://github.com/apu242007/OPENAUDITOR.git
cd OPENAUDITOR
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

- descarga de paquetes,
- creación o actualización de `node_modules`,
- y fin del proceso sin error fatal.

### Paso 6. Levantar la app en desarrollo

```powershell
npm start
```

Qué deberías ver:

- el servidor iniciando,
- mensajes del tipo `Server started successfully`,
- y referencia al puerto `3001`.

### Paso 7. Abrir la app

Abrí en el navegador:

```text
http://localhost:3001
```

### Paso 8. Verificar pantallas principales

Probá estas rutas:

```text
http://localhost:3001
http://localhost:3001/catalog
http://localhost:3001/settings
http://localhost:3001/about
```

Qué deberías ver:

1. dashboard principal,
2. catálogo comunitario,
3. configuración,
4. pantalla informativa del proyecto.

### Paso 9. Verificar el modo abierto

En otra terminal:

```powershell
curl http://localhost:3001/api/auth/status
```

Resultado esperado:

```json
{"securityRequired":false,"authenticated":true,"mode":"open"}
```

### Paso 10. Verificar tests

```powershell
npm test
```

Resultado esperado:

- tests pasando,
- y salida tipo `28 passing` o superior.

---

## 8. Instalación rápida para quien ya usa Node

```bash
git clone https://github.com/apu242007/OPENAUDITOR.git
cd OPENAUDITOR
npm install
npm start
```

Abrí:

```text
http://localhost:3001
```

---

## 9. Scripts disponibles

```bash
npm start
npm run dev
npm run start:prod
npm run check:prod
npm test
npm run test:coverage
npm run lint
npm run pm2:start
npm run pm2:restart
npm run pm2:logs
```

### Qué hace cada script

- `npm start`: arranca la app normal.
- `npm run dev`: arranca con `nodemon`.
- `npm run start:prod`: arranca en modo producción.
- `npm run check:prod`: valida endpoints críticos de producción.
- `npm test`: ejecuta la suite de tests.
- `npm run test:coverage`: ejecuta tests con cobertura.
- `npm run lint`: corre ESLint.
- `npm run pm2:start`: levanta con PM2.
- `npm run pm2:restart`: reinicia la instancia en PM2.
- `npm run pm2:logs`: mira logs con PM2.

---

## 10. Primer uso paso a paso

Esta parte está pensada para que cualquier persona entienda el flujo completo del producto.

### Flujo 1. Crear una plantilla desde cero

1. Abrí `http://localhost:3001`
2. Hacé clic en `Nueva plantilla`
3. Elegí crear una plantilla nueva o importar desde JSON
4. Definí nombre, descripción y branding
5. Agregá páginas
6. Agregá secciones
7. Agregá preguntas
8. Definí si son requeridas
9. Configurá scoring si aplica
10. Guardá el borrador

### Flujo 2. Crear una plantilla desde el catálogo comunitario

1. Entrá al dashboard
2. Hacé clic en `Importar desde JSON`
3. Elegí una plantilla real del catálogo
4. Tocá `Usar ejemplo`
5. Se importa como borrador
6. Entrás al editor para adaptarla

### Flujo 3. Probar una plantilla antes de publicarla

1. Abrí el editor de una plantilla
2. Guardá el borrador
3. Tocá `Probar`
4. Se crea una inspección de prueba
5. Abrís el inspector real con el snapshot del borrador
6. Validás la experiencia antes de publicar

### Flujo 4. Publicar una plantilla

1. Revisá estructura, branding y portada
2. Probá la plantilla
3. Volvé al editor
4. Hacé clic en `Publicar`
5. Desde ese momento ya se puede usar como plantilla operativa

### Flujo 5. Ejecutar una inspección

1. Desde el dashboard elegí una plantilla publicada
2. Tocá `Iniciar`
3. Completá respuestas
4. Sumá notas, fotos, acciones y señalamientos
5. Usá filtros como `Solo pendientes` o `Solo requeridas`
6. Revisá el panel `Hallazgos en vivo`
7. Guardá
8. Finalizá cuando no queden requeridas pendientes

### Flujo 6. Exportar resultados

1. Abrí la inspección terminada
2. Elegí exportar a `PDF`, `CSV`, `XLSX` o `JSON`
3. Descargá el archivo
4. Si la plantilla tiene portada, el PDF la incluye

---

## 11. Qué tiene el editor

El editor actual incluye:

- visualizador en tiempo real,
- panel redimensionable,
- branding,
- portada con imagen,
- logo junto al nombre,
- biblioteca de preguntas,
- secciones repetibles,
- ayuda contextual,
- lógica condicional,
- preview PDF,
- y modo prueba.

### Mejoras UX actuales en el editor

- mejor tipografía,
- acentos corregidos,
- panel más claro,
- preview más útil,
- interfaz más tipo studio,
- y base más limpia para CSP.

---

## 12. Qué tiene el inspector

El inspector está pensado para trabajo real en campo.

### Hoy incluye

- progreso por página,
- navegación lateral,
- métricas por sección,
- filtros inteligentes,
- modo compacto,
- colapsado de respondidas,
- `Siguiente pendiente`,
- `Siguiente requerida`,
- `Con evidencia`,
- panel de hallazgos en vivo,
- severidad de hallazgos,
- resumen ejecutivo,
- y bloqueo de cierre si falta algo obligatorio.

### Qué resuelve esto

1. checklists largos,
2. revisión rápida,
3. foco en obligatorias,
4. foco en evidencia,
5. y menos errores al finalizar.

---

## 13. Trabajo offline

OPENAUDITOR no depende obligatoriamente de una conexión permanente.

### Modo local

1. Corrés la app en tu PC
2. Todo se guarda localmente
3. Exportás cuando querés

### Modo offline con HTML standalone

1. Exportás una plantilla como HTML autónomo
2. El operario la abre en celular
3. Completa respuestas aunque no tenga internet
4. El HTML guarda temporalmente en el navegador
5. Después exporta JSON o sincroniza cuando haya conexión

### Modo offline + sync

1. El celular trabaja offline
2. Cuando vuelve la conexión envía datos
3. El receptor puede ser:
   - `Apps Script`
   - `Webhook`
   - `PocketBase`
   - `Supabase`
   - otra instancia de OPENAUDITOR

---

## 14. Sincronización gratis y open source

### Opción 1. Apps Script + Google Sheets

Ideal para arrancar rápido y gratis.

Paso a paso:

1. Generás el HTML standalone
2. Configurás destino `Apps Script`
3. El payload incluye `sheetSchema` y `flatRow`
4. Apps Script crea una hoja por plantilla
5. Agrega columnas automáticamente
6. Guarda además el payload crudo en una hoja raw

### Opción 2. Webhook propio

Ideal para integraciones más libres.

Paso a paso:

1. Configurás una URL receptora
2. El HTML o la app envían JSON por `fetch`
3. Tu backend procesa y almacena

### Opción 3. PocketBase o Supabase

Ideal para evolución profesional open source.

Paso a paso:

1. Montás el backend
2. Configurás el destino de sync
3. Enviás inspecciones y adjuntos
4. Conservás control total del sistema

---

## 15. Catálogo comunitario

El proyecto ya incluye plantillas reales listas para importar.

### Rubros incluidos hoy

- seguridad,
- mantenimiento,
- retail,
- calidad,
- construcción,
- vehículos.

### Orientación legal incluida

Hay plantillas enfocadas en:

- Ley 19.587,
- Decreto 351/79,
- salidas de emergencia,
- riesgo eléctrico,
- orden y limpieza,
- depósitos,
- incendio,
- oficinas,
- servicios para el personal.

### Cómo usar el catálogo

1. Abrí `http://localhost:3001/catalog`
2. Filtrá por rubro o foco legal
3. Revisá la plantilla
4. Importala como borrador
5. Adaptala a tu operación

---

## 16. Producción paso a paso

Si querés publicar OPENAUDITOR para uso serio interno o comunitario, hacelo así.

### Opción A. Producción simple con Node

1. Instalá dependencias

```bash
npm install
```

2. Arrancá en modo producción

```bash
npm run start:prod
```

3. Verificá

```bash
npm run check:prod
```

### Opción B. Producción con PM2

1. Instalá dependencias

```bash
npm install
```

2. Levantá PM2

```bash
npm run pm2:start
```

3. Mirá logs

```bash
npm run pm2:logs
```

4. Reiniciá cuando haga falta

```bash
npm run pm2:restart
```

### Opción C. Producción con Docker

1. Revisá `Dockerfile`
2. Revisá `docker-compose.yml`
3. Levantá contenedores

```bash
docker compose up -d --build
```

4. Verificá con:

```bash
docker compose ps
```

### Recomendaciones de producción

1. Definí `DATA_DIR` persistente.
2. Poné un reverse proxy con `Nginx` o similar.
3. Serví por HTTPS si la vas a exponer.
4. Verificá espacio en disco.
5. Corré `npm run check:prod`.

### Archivos útiles para deploy

- [ecosystem.config.js](c:/Users/jcastro/OneDrive%20-%20EXERTION%20AI/01-APPS%20GITHUB/OPENAUDITOR/ecosystem.config.js)
- [Dockerfile](c:/Users/jcastro/OneDrive%20-%20EXERTION%20AI/01-APPS%20GITHUB/OPENAUDITOR/Dockerfile)
- [docker-compose.yml](c:/Users/jcastro/OneDrive%20-%20EXERTION%20AI/01-APPS%20GITHUB/OPENAUDITOR/docker-compose.yml)
- [nginx.conf.example](c:/Users/jcastro/OneDrive%20-%20EXERTION%20AI/01-APPS%20GITHUB/OPENAUDITOR/nginx.conf.example)
- [scripts/check-production.js](c:/Users/jcastro/OneDrive%20-%20EXERTION%20AI/01-APPS%20GITHUB/OPENAUDITOR/scripts/check-production.js)

---

## 17. Verificaciones rápidas útiles

### Verificar que la app está viva

```powershell
curl http://localhost:3001/readyz
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/status
```

### Verificar pantallas

```text
http://localhost:3001/
http://localhost:3001/catalog
http://localhost:3001/settings
http://localhost:3001/about
```

### Verificar pruebas

```bash
npm test
```

---

## 18. Arquitectura

```text
┌─────────────────────────────────────────────────────────┐
│                    Navegador / Celular                   │
│              HTML + CSS + JavaScript vanilla             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / fetch
┌────────────────────▼────────────────────────────────────┐
│                   Express (Node.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Helmet   │  │Rate Limit│  │  CSP      │  │Sanitize │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                         │
│  routes/          lib/             config/               │
│  ├ templates.js   ├ db.js          └ constants.js        │
│  ├ inspections.js ├ auth.js                              │
│  ├ admin.js       ├ cache.js                             │
│  ├ search.js      ├ validation.js                        │
│  └ pages.js       ├ scoring.js                           │
│                   ├ swagger.js                            │
│                   └ ssrf-puppeteer.js                     │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼─────────────────┐
    │ SQLite  │   │ Puppeteer │  │ Destinos de sync     │
    │ (WAL)   │   │ (PDF)     │  │ ├ Apps Script        │
    │         │   │           │  │ ├ Webhooks           │
    │         │   │           │  │ ├ PocketBase          │
    └─────────┘   └───────────┘  │ └ Supabase           │
                                 └──────────────────────┘
```

### Decisiones clave

- **SQLite con WAL**: journaling write-ahead para concurrencia sin servidor de base de datos.
- **CSP endurecida**: `default-src 'self'`, `object-src 'none'`, `frame-src 'none'`.
- **Rate limiting**: 120 req/min general, 10 req/min exports, 10 req/15min login.
- **SSRF guard**: Puppeteer y webhooks verifican que la URL destino no sea IP privada.
- **Frontend sin frameworks**: vanilla JS para máxima portabilidad y bajo overhead.

---

## 19. Modelo de datos

Las entidades principales viven en `auditorlibre.db` (SQLite):

| Entidad | Tabla | Campos clave | Relaciones |
|---|---|---|---|
| **Plantilla** | `templates` | `id`, `data` (JSON), `status`, `updated_at` | Tiene muchas inspecciones |
| **Inspección** | `inspections` | `id`, `template_id`, `data` (JSON), `status`, `created_at`, `completed_at` | Pertenece a plantilla, tiene acciones |
| **Acción correctiva** | `actions` | `id`, `inspection_id`, `question_id`, `description`, `status`, `assigned_to`, `deadline`, `flagged` | Pertenece a inspección |
| **Biblioteca** | `library` | `id`, `data` (JSON) | Preguntas reutilizables |
| **Configuración** | `config` | `id` (siempre 1), `data` (JSON) | Singleton global |
| **Sesiones** | `sessions` | `token`, `created_at`, `expires_at`, `user_agent`, `ip_address` | Auth interna |
| **Tokens** | `tokens` | `token`, `data` (JSON), `expires_at` | Tokens de inspección compartida |

Dentro del campo `data` JSON de cada plantilla se guardan páginas, secciones, preguntas, lógica condicional, scoring y configuración de portada.

---

## 20. Seguridad

### Modo abierto vs modo protegido

Por defecto OPENAUDITOR corre en **modo abierto** (`isAuthenticated` devuelve `true` siempre). Esto es intencional para uso local y de equipo pequeño.

Si necesitás proteger el acceso:

1. activá PIN de seguridad desde `Configuración`,
2. las sesiones se guardan en la tabla `sessions` con expiración a 24 horas,
3. las contraseñas se hashean con PBKDF2 (100.000 iteraciones, SHA-512, salt de 16 bytes),
4. las cookies usan `HttpOnly`, `SameSite=Strict` y `Secure` en producción.

### CSP endurecida

La app aplica Content Security Policy vía Helmet:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (necesario para el editor inline)
- `script-src-attr 'none'`
- `object-src 'none'`
- `frame-src 'none'`
- `img-src 'self' data: blob:`

### Si exponés a internet

1. poné un reverse proxy (Nginx, Caddy) con HTTPS,
2. activá el PIN o integrá tu propio auth externo,
3. limitá acceso por IP o VPN si es uso interno,
4. revisá `DATA_DIR` y permisos de filesystem,
5. usá `NODE_ENV=production` para cookies seguras.

### Protecciones incluidas

- Rate limiting por IP en toda la API.
- Sanitización automática de body en cada request.
- Validación de input con límites explícitos (longitudes, cantidades).
- Protección SSRF en Puppeteer y webhooks.
- Comparación constant-time en verificación de PIN.

---

## 21. API y extensibilidad

### Documentación interactiva

En modo desarrollo, Swagger UI está disponible en:

```text
http://localhost:3001/api-docs
```

El spec OpenAPI 3.0 en JSON:

```text
http://localhost:3001/api-docs.json
```

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/templates` | Listar plantillas |
| `POST` | `/api/templates` | Crear plantilla |
| `PUT` | `/api/templates/:id` | Actualizar plantilla |
| `DELETE` | `/api/templates/:id` | Eliminar plantilla |
| `POST` | `/api/templates/:id/publish` | Publicar plantilla |
| `POST` | `/api/templates/:id/duplicate` | Duplicar plantilla |
| `GET` | `/api/inspections` | Listar inspecciones |
| `POST` | `/api/inspections` | Crear inspección |
| `PATCH` | `/api/inspections/:id` | Actualizar inspección |
| `GET` | `/api/inspections/:id/export/:format` | Exportar (pdf, csv, xlsx, json) |
| `GET` | `/api/actions` | Listar acciones correctivas |
| `POST` | `/api/actions` | Crear acción |
| `PUT` | `/api/actions/:id` | Actualizar acción |
| `GET` | `/api/library` | Biblioteca de preguntas |
| `GET` | `/api/analytics/stats` | Estadísticas generales |
| `GET` | `/api/config` | Leer configuración |
| `PATCH` | `/api/config` | Actualizar configuración |
| `GET` | `/api/auth/status` | Estado de autenticación |
| `GET` | `/health` | Health check |
| `GET` | `/readyz` | Readiness probe (K8s) |
| `GET` | `/healthz` | Liveness probe (K8s) |
| `GET` | `/api/i18n/:lang` | Traducciones (es/en) |

### Webhooks

Configurá webhooks desde `Configuración` para recibir eventos en tu backend:

- `inspection.created`
- `inspection.completed`
- `inspection.autosaved`
- `action.status_changed`
- `template.published`

Cada payload incluye firma HMAC-SHA256 en el header `X-OA-Signature` si configurás un secret.

### Plugins

La carpeta `plugins/` contiene ejemplos de conectores. Hoy no hay un sistema formal de plugins cargables, pero la carpeta funciona como base de diseño y contratos de integración. Ejemplo incluido:

- `plugins/examples/n8n-openauditor-sync`: conector para n8n.

---

## 22. Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |
| `HOST` | `localhost` | Host de escucha |
| `NODE_ENV` | `development` | Entorno (`development`, `production`, `test`) |
| `DATA_DIR` | `(env-paths)/auditorlibre/Data` | Directorio de datos persistentes |
| `LOG_LEVEL` | `info` | Nivel de log (`error`, `warn`, `info`, `debug`) |
| `SESSION_MAX_AGE` | `86400000` (24h en ms) | Duración de sesión |
| `OPENAUDITOR_BASE_URL` | `http://127.0.0.1:3001` | URL base para scripts de verificación |

Podés crear un archivo `.env` en la raíz del proyecto para setear estas variables sin modificar código.

---

## 23. Performance y límites

### Límites configurados

| Recurso | Límite |
|---|---|
| Tamaño máximo de archivo adjunto | 10 MB |
| Tamaño máximo de importación | 50 MB |
| Tamaño máximo de imagen de branding | 2 MB |
| Archivos por upload | 10 |
| Páginas por plantilla | 100 |
| Secciones por página | 50 |
| Preguntas por sección | 200 |
| Tags por plantilla | 20 |
| Requests API por minuto | 120 |
| Exports por minuto | 10 |
| Intentos de login en 15 min | 10 |

### SQLite en producción

SQLite con WAL maneja bien miles de plantillas e inspecciones en escenarios de equipo pequeño a mediano. Para volúmenes muy altos (+10.000 inspecciones concurrentes por segundo), considerar migrar a PostgreSQL.

El `busy_timeout` está seteado en 5 segundos para tolerar escrituras concurrentes.

---

## 24. Backup y restauración

### Dónde viven los datos

- **Base de datos**: `DATA_DIR/auditorlibre.db`
- **Uploads**: `DATA_DIR/uploads/`
- **Backups automáticos**: `DATA_DIR/backups/`
- **Logs**: `DATA_DIR/logs/`

En Windows, `DATA_DIR` por defecto es:

```text
C:\Users\TU_USUARIO\AppData\Local\auditorlibre-nodejs\Data
```

### Cómo hacer backup manual

1. Pará la app
2. Copiá la carpeta `DATA_DIR` completa
3. Levantá la app de nuevo

O usá el endpoint de backup desde la UI de admin.

### Cómo restaurar

1. Pará la app
2. Reemplazá la carpeta `DATA_DIR` con el backup
3. Levantá la app

### Migración entre versiones

La app corre migraciones automáticas de schema al iniciar (`runSchemaMigrations` en `lib/db.js`). Si venías de la versión JSON plana, la primera ejecución migra los archivos `.json` a SQLite y los renombra a `.migrated.bak`.

### Migración desde iAuditor u otras herramientas

Si tenés inspecciones exportadas como JSON o CSV desde otra herramienta:

1. adaptá el formato al schema de OPENAUDITOR (ver `schemas/`),
2. importá vía `POST /api/templates` o desde la UI con `Importar JSON`,
3. las plantillas importadas quedan como borrador para revisión.

---

## 25. Internacionalización (i18n)

La interfaz soporta **español** e **inglés** desde la barra de navegación (botones `ES` / `EN`).

Las traducciones viven en:

```text
i18n/
├─ es.json
└─ en.json
```

El endpoint `/api/i18n/:lang` sirve las traducciones con cache de 1 hora.

Para agregar un idioma nuevo:

1. creá `i18n/XX.json` copiando `es.json`,
2. traducí las claves,
3. agregá el botón en la barra de navegación (`public/index.html`).

---

## 26. Estructura principal del repo

```text
OPENAUDITOR/
├─ public/                 # UI y assets
├─ routes/                 # endpoints y páginas
├─ lib/                    # utilidades de backend
├─ config/                 # constantes y configuración
├─ i18n/                   # traducciones (es, en)
├─ templates/catalog/      # plantillas comunitarias
├─ docs/                   # documentación extendida
├─ plugins/                # ejemplos de conectores
├─ schemas/                # ejemplos de payloads
├─ security/               # middleware de seguridad
├─ test/                   # tests
├─ .github/workflows/      # CI/CD pipeline
├─ server.js               # arranque principal
├─ standalone_inspection.js
└─ pdf_report.js
```

---

## 27. FAQ

### ¿Necesito internet para usar OPENAUDITOR?

No. La app funciona 100% local. Solo necesitás conexión si querés sincronizar con destinos externos o usar el catálogo remoto.

### ¿Puedo correrlo en un celular?

No como servidor, pero podés exportar inspecciones como HTML standalone y abrirlas en el navegador del celular. Funcionan offline.

### ¿SQLite no es un riesgo para producción?

Para equipos de hasta 50 usuarios concurrentes, SQLite con WAL funciona muy bien. Si necesitás escalar más, el modelo de datos permite migrar a PostgreSQL.

### ¿Cómo activo la autenticación?

Desde `Configuración` → activá PIN de seguridad. Las sesiones se crean con token de 32 bytes y cookies HttpOnly.

### ¿Puedo usar OPENAUDITOR con n8n, Zapier o Make?

Sí. Configurá un webhook desde `Configuración` y apuntalo a tu flujo de automatización. El payload es JSON estándar con firma HMAC.

### ¿Qué formatos de exportación soporta?

PDF, CSV, XLSX y JSON. El PDF incluye portada con branding si la plantilla la tiene configurada.

### ¿Puedo importar plantillas de iAuditor?

No hay un importador directo todavía, pero si exportás la plantilla como JSON, podés adaptarla al formato de OPENAUDITOR y subirla.

### ¿Dónde reporto bugs o pido features?

En [GitHub Issues](https://github.com/apu242007/OPENAUDITOR/issues). Usá las plantillas de bug report o feature request.

---

## 28. Documentación relacionada

- [docs/deployment/README.md](docs/deployment/README.md)
- [docs/deployment/docker.md](docs/deployment/docker.md)
- [docs/deployment/hosting-checklist.md](docs/deployment/hosting-checklist.md)
- [docs/integrations/README.md](docs/integrations/README.md)
- [public/sync-guide.html](public/sync-guide.html)
- [templates/catalog/README.md](templates/catalog/README.md)

---

## 29. Troubleshooting

### La app no arranca

1. Revisá que Node esté instalado.
2. Revisá que `npm install` haya terminado bien.
3. Revisá si el puerto `3001` ya está ocupado.

### El navegador muestra errores raros de extensiones

Probá en una ventana incógnita o en otro perfil. Algunos errores como `overlay_bundle.js`, `webcomponents-ce.js` o warnings de React Router suelen venir de extensiones, no del proyecto.

### El PDF no sale bien

1. Revisá que Puppeteer haya instalado bien.
2. Probá exportar una inspección simple.
3. Revisá branding, portada y rutas de archivos.

### El health sale degradado

Eso suele indicar bajo espacio en disco o una condición operativa no ideal. Revisá `DATA_DIR` y espacio disponible.

### GitHub Actions tarda demasiado

El workflow actual ya omite `Snyk`, `SonarCloud` y `Docker publish` si faltan secretos. Si un run viejo queda colgado, cancelalo desde `Actions`.

---

## 30. Contribuir

Si querés sumar mejoras:

1. hacé fork,
2. creá una rama,
3. implementá cambios,
4. corré `npm test`,
5. abrí PR.

Leé también:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)

---

## 31. Licencia

Este proyecto se distribuye bajo la licencia incluida en:

- [LICENSE](LICENSE)

---

## 32. Resumen final

Si querés una herramienta open source para inspecciones que:

- se pueda instalar fácil,
- funcione offline,
- genere reportes serios,
- tenga catálogo de plantillas,
- se pueda adaptar,
- y no dependa de licencias por usuario,

**OPENAUDITOR ya está listo para jugar en esa cancha.**

---

## 33. Inglés / English

También tenés una versión base en inglés para compartir el proyecto fuera del mercado hispano:

- [README_EN.md](README_EN.md)
