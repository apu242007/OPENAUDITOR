# Hosting Checklist

## Antes de publicar

- Node 18+
- carpeta persistente para datos
- espacio libre suficiente en disco
- backups periódicos
- HTTPS si habrá acceso externo
- variable `DATA_DIR` definida si no usás la ruta por defecto
- revisión de límites de subida si vas a manejar fotos y adjuntos

## Variables mínimas

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATA_DIR=/data
LOG_LEVEL=info
SECURE_COOKIES=false
```

## Verificaciones mínimas

```bash
npm run check:prod
```

También podés validar manualmente:

- `/readyz` responde `200`
- `/health` responde JSON
- `/` responde
- `/settings` responde
- exportación PDF funciona
- importación standalone funciona

## Si vas a publicar fuera de LAN

- montá reverse proxy
- activá HTTPS
- recién ahí usá `SECURE_COOKIES=true`
- documentá la URL pública final para QR y sync

## No olvidar

- no usar múltiples procesos contra la misma base SQLite
- no usar PM2 `cluster`
- no dejar el disco al límite: `health` ya lo reporta como `degraded`
