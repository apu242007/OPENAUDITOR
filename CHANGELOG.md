# Changelog

## Unreleased

### Added

- destinos de sincronización configurables para HTML autónomo
- guía integrada de sincronización offline
- ejemplo oficial de Apps Script / Google Sheets
- ejemplo oficial de receptor PocketBase
- payload standalone con `sheetSchema` y `flatRow`
- estrategia de una hoja por plantilla para Apps Script
- recursos open source para despliegue, integraciones y catálogo de plantillas

### Changed

- el helper de `Apps Script` en la UI ahora explica que usa una hoja por plantilla
- el README ahora describe mejor los modos local, offline y sync opcional
- el ejemplo de Sheets amplía columnas automáticamente cuando cambia una plantilla

### Fixed

- validación de `branding.footerText` en config
- exportación standalone que llamaba `filePathToBase64` sin `dataDir`

## Notes

Este archivo busca resumir cambios relevantes para usuarios, integradores y contribuidores. Cuando una release futura exista, conviene mover el bloque `Unreleased` a una versión fechada.
