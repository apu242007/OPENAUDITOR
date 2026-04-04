# Guía Avanzada y Documentación Técnica

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

Por defecto Auditor Libre corre en **modo abierto** (`isAuthenticated` devuelve `true` siempre). Esto es intencional para uso local y de equipo pequeño.

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

1. adaptá el formato al schema de Auditor Libre (ver `schemas/`),
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

### ¿Necesito internet para usar Auditor Libre?

No. La app funciona 100% local. Solo necesitás conexión si querés sincronizar con destinos externos o usar el catálogo remoto.

### ¿Puedo correrlo en un celular?

No como servidor, pero podés exportar inspecciones como HTML standalone y abrirlas en el navegador del celular. Funcionan offline.

### ¿SQLite no es un riesgo para producción?

Para equipos de hasta 50 usuarios concurrentes, SQLite con WAL funciona muy bien. Si necesitás escalar más, el modelo de datos permite migrar a PostgreSQL.

### ¿Cómo activo la autenticación?

Desde `Configuración` → activá PIN de seguridad. Las sesiones se crean con token de 32 bytes y cookies HttpOnly.

### ¿Puedo usar Auditor Libre con n8n, Zapier o Make?

Sí. Configurá un webhook desde `Configuración` y apuntalo a tu flujo de automatización. El payload es JSON estándar con firma HMAC.

### ¿Qué formatos de exportación soporta?

PDF, CSV, XLSX y JSON. El PDF incluye portada con branding si la plantilla la tiene configurada.

### ¿Puedo importar plantillas de iAuditor?

No hay un importador directo todavía, pero si exportás la plantilla como JSON, podés adaptarla al formato de Auditor Libre y subirla.

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

