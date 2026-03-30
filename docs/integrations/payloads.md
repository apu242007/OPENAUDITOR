# Payloads

## Payload Standalone

Campos importantes:

- `templateId`
- `templateName`
- `answers`
- `repeatableAnswers`
- `media`
- `completedAt`
- `exportedFrom`
- `inspectorFileId`
- `sheetSchema`
- `flatRow`
- `syncDestination`

## Filosofía

El payload crudo debe ser suficiente para:

- importar de nuevo en OPENAUDITOR
- persistir en otro backend
- mapear a hojas de cálculo
- disparar automatizaciones

## Recomendación

Guardar siempre el payload crudo aunque luego normalices campos a tablas o columnas.
