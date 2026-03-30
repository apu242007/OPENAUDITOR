# Offline Sync

## Patrón Recomendado

1. El operario trabaja offline.
2. El HTML guarda borrador y adjuntos localmente.
3. Al finalizar, intenta sincronizar.
4. Si no puede, exporta JSON.

## Destinos Recomendados

- Apps Script para arranque gratis
- webhook JSON para automatización
- PocketBase para uso open source serio
- Supabase para equipos con stack SQL

## Regla de Oro

Nunca asumir conectividad. Siempre mantener un camino manual de exportación/importación.
