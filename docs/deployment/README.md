# Deployment Guide

Esta carpeta reúne recetas de despliegue para que Auditor Libre sea fácil de adoptar más allá de `localhost`.

## Objetivo

Permitir cuatro caminos oficiales:

- correr localmente en una PC
- correr en una red interna con `PM2`
- desplegar en `Docker`
- sumar un backend remoto opcional para sync open source

## Guías incluidas

- [Docker](./docker.md)
- [PocketBase](./pocketbase.md)
- [Supabase](./supabase.md)
- [Railway / Render / VPS](./hosting-checklist.md)

## Recomendación actual

Para equipos pequeños:

- Auditor Libre local o en Docker
- HTML autónomo para captura offline
- Apps Script o webhook económico para sync gratis

Para equipos que quieren crecer:

- Auditor Libre como nodo de administración
- PocketBase o Supabase como capa remota opcional

## Nota importante sobre producción

Auditor Libre usa `SQLite`, así que la recomendación operativa es:

- `1` proceso por instancia
- `fork` en PM2
- no usar `cluster`
- no compartir la misma base SQLite entre múltiples procesos escritores
