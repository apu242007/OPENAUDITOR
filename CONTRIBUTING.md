# Contribuir a Auditor Libre

Auditor Libre quiere ser una base open source real para inspecciones, no solo una app local. Este documento está pensado para que cualquier persona pueda ayudar sin perder tiempo adivinando el flujo del proyecto.

## Antes de Empezar

1. Hacé fork del repositorio.
2. Creá una rama descriptiva.
3. Instalá dependencias con `npm install`.
4. Ejecutá la app con `npm start`.
5. Antes de abrir un PR, corré `npm test`.

## Qué Tipo de Aportes Queremos

- correcciones de bugs
- mejoras de UX/UI
- integraciones open source
- mejoras de offline/sync
- tests
- documentación
- packs de plantillas reutilizables
- ejemplos de despliegue

## Principios del Proyecto

- `local-first`: el proyecto debe seguir funcionando bien sin depender de SaaS.
- `open source practical`: las mejoras tienen que ayudar a equipos reales a desplegar y adaptar su propia herramienta.
- `portable data`: priorizamos JSON, import/export y compatibilidad de datos.
- `offline-first where possible`: si una mejora toca inspección móvil, considerá conectividad limitada.
- `low-friction ops`: si se puede resolver sin sumar infraestructura compleja, mejor.

## Flujo Recomendado para PRs

1. Describí el problema real.
2. Explicá la solución propuesta.
3. Indicá el impacto en datos, seguridad, offline o integraciones.
4. Si hay UI, incluí capturas o una descripción clara.
5. Si el cambio toca storage, exportación o sync, agregá pruebas o al menos pasos de validación manual.

## Áreas Sensibles

- persistencia de plantillas e inspecciones
- import/export JSON
- HTML standalone
- PDF/XLSX/CSV
- seguridad local y sesiones
- uso por LAN
- compatibilidad del payload offline

## Good First Issues

Las mejores primeras contribuciones suelen ser:

- mejorar textos y acentos en la UI
- sumar validaciones pequeñas
- arreglar comportamientos visuales en mobile
- agregar tests unitarios
- expandir la guía de integraciones
- crear plantillas comunitarias

## Si Proponés una Nueva Feature

Incluí siempre:

- caso de uso operativo
- si afecta privacidad o seguridad
- si cambia payloads o formatos
- si requiere nuevas dependencias
- si es opcional o núcleo del producto

## Si Proponés una Integración

Idealmente agregá:

- guía de uso
- payload esperado
- ejemplo mínimo funcional
- estrategia de fallback cuando no hay internet

## Estructura de Documentación Recomendada

Cuando una mejora amerite docs, usá alguno de estos lugares:

- `docs/deployment/`: despliegue
- `docs/integrations/`: conectores, APIs, sync
- `templates/catalog/`: plantillas comunitarias
- `schemas/`: payloads y formatos JSON
- `plugins/`: extensiones y conectores experimentales

## Checklist Antes de Abrir un PR

- la app arranca localmente
- no rompiste `npm test`
- el cambio está acotado y explicado
- si cambia UX, se puede entender sin contexto extra
- si cambia datos, hay nota de compatibilidad

## Comunicación

Preferimos issues y PRs concretos, con lenguaje claro y foco en resolver trabajo real. Si algo todavía no está listo para merge, igual sirve abrir una discusión con una propuesta chica y aterrizada.
