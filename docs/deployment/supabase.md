# Supabase

Supabase es una buena opcion cuando necesitas:

- Postgres
- una base remota libre para sincronizacion opcional
- storage remoto
- edge functions

## Estrategia recomendada

- usar una Edge Function como receptor del payload standalone
- guardar primero el payload crudo
- normalizar despues si hace falta

## Cuando elegirlo

- si el equipo ya usa Postgres
- si queres integracion simple con BI o reporting posterior
- si necesitas una base remota gratuita para empezar y luego autoevolucionar
