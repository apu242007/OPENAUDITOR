# n8n OPENAUDITOR Sync

Este ejemplo deja un primer conector funcional orientado a n8n usando el payload standalone.

## Qué Hace

- recibe el payload de OPENAUDITOR en un `Webhook`
- preserva el JSON crudo
- aplana `flatRow`
- lo deja listo para Google Sheets, bases o APIs

## Archivos

- `workflow.json`: workflow de ejemplo para importar en n8n

## Flujo Sugerido

1. Importar `workflow.json` en n8n.
2. Publicar el webhook.
3. Copiar la URL del webhook en `Configuración -> Sync offline y destinos`.
4. Elegir tipo `Webhook JSON` en OPENAUDITOR.

## Uso con Google Sheets

La forma más simple es conectar el nodo `Normalize Flat Row` con un nodo de Google Sheets en n8n.
Si querés una hoja por plantilla:

- usá `templateName` para decidir la pestaña
- o mantené un flujo por plantilla
