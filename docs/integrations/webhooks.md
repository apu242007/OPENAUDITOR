# Webhooks

Auditor Libre ya emite webhooks de salida para eventos internos. Además, el HTML autónomo puede enviar el payload de inspección a destinos remotos tipo webhook.

## Buenas Prácticas

- validar `Content-Type`
- registrar payload crudo
- responder rápido con `200`
- procesar pesado en segundo plano

## Casos de Uso

- n8n
- Make
- ERP
- middleware propio
- colas internas
