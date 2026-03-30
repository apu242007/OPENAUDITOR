# Docker

## Inicio rápido

1. Copiá `.env.example` a `.env`
2. Ajustá variables
3. Ejecutá:

```bash
docker compose up -d --build
```

## Variables mínimas recomendadas

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATA_DIR=/data
LOG_LEVEL=info
SECURE_COOKIES=false
```

## Verificación

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:3001/readyz
curl http://localhost:3001/health
```

## Cuándo conviene

- querés una instalación repetible
- necesitás compartir la app en una red local
- querés simplificar backups y upgrades

## Recomendaciones

- mantener el volumen `auditor-data`
- mantener el volumen `auditor-logs`
- usar reverse proxy si la instancia se publica fuera de LAN
- activar `SECURE_COOKIES=true` solo si estás detrás de HTTPS

## Reverse proxy

Se incluye un ejemplo base:

- `nginx.conf.example`
