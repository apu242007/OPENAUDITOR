# MOTION_GUIDE

Guía interna para mantener el sistema de animaciones de Auditor Libre consistente, accesible y de bajo riesgo.

## Tabla De Contenido

1. Objetivo
2. Principios Del Sistema
3. Convención De Nombres
4. Cuándo Aplicar Motion
5. Cuándo No Aplicar Motion
6. Regla De Activación
7. Estructura Recomendada
8. Reglas De Accesibilidad
9. Ejemplo Hero: Reporte Final
10. Buenas Prácticas
11. Cómo Agregar Una Nueva Animación
12. Checklist Antes De Merge

## Objetivo

El sistema de motion del proyecto existe para:

- dar feedback visual claro
- reforzar jerarquía y foco
- mejorar la sensación de calidad de la UI
- hacerlo sin tocar lógica de negocio ni acoplar animaciones a features

La idea no es "animar todo". La idea es animar solo lo que mejora comprensión, confirmación o presencia visual.

## Principios Del Sistema

- Motion siempre debe ser `opt-in`.
- Motion debe aplicarse solo a componentes concretos.
- Motion no debe depender de lógica de negocio para existir.
- Motion debe poder desactivarse por componente sin romper layout.
- Motion debe respetar siempre `prefers-reduced-motion`.
- Motion debe vivir separado de la lógica funcional.

## Convención De Nombres

### Clases visuales

- `ui-*-hero`
  - para elementos principales o de alto impacto visual
  - ejemplos: score principal, CTA principal, bloque destacado

- `ui-*-soft`
  - para motion sutil o de soporte
  - ejemplos: cards secundarias, botones auxiliares, secciones del reporte

- `ui-*-live`
  - para estados dinámicos que cambian en tiempo real
  - ejemplos: sync status, progreso, indicadores online/offline

- `ui-*-shell`
  - para contenedores visuales
  - ejemplos: progress shell, modal shell, topbar shell

### Clases de estado

- `is-open`
- `is-active`
- `is-closing`
- `is-advancing`
- `is-status-flash`

Regla:
- `ui-*` define capacidad visual
- `is-*` define estado temporal

## Cuándo Aplicar Motion

Aplicar motion cuando ayude a:

- señalar jerarquía visual
- confirmar que una acción ocurrió
- mostrar avance de una tarea
- dar feedback a acciones críticas
- mejorar orientación en navegación
- destacar cambios de estado importantes

Buenos candidatos:

- score final
- progreso de inspección
- sync status
- CTA principales
- cards destacadas
- modales
- dropdowns
- hallazgos críticos
- pills o badges relevantes

## Cuándo No Aplicar Motion

Evitar motion en:

- inputs densos o con escritura continua
- tablas grandes
- listas que cambian constantemente
- grids con muchos nodos simultáneos
- logs vivos
- componentes que re-renderizan muy seguido
- zonas donde el movimiento compita con lectura o captura de datos

Evitar también:

- loops decorativos innecesarios
- delays largos
- animaciones que cambian layout
- animaciones que hagan saltar contenido

## Regla De Activación

Las animaciones deben activarse siempre desde JS mediante funciones de motion.

Nunca:

- meter motion global agresivo sobre tags genéricos
- animar todos los `div`, `button`, `table`, etc.
- acoplar clases de motion directamente a la lógica de negocio

Siempre:

- encapsular en funciones `init...Motion()`
- marcar elementos concretos con clases `ui-*`
- usar `MutationObserver` solo cuando haga falta

Ejemplo:

```js
function initReportDetailMotion(root = document) {
  const reportRoot = document.getElementById('reportView');
  if (!reportRoot || reportRoot.classList.contains('hidden')) return;

  reportRoot.querySelectorAll('.report-score-box').forEach((el) => {
    el.classList.add('ui-report-score-hero');
  });

  reportRoot.querySelectorAll('.report-actions .btn').forEach((el) => {
    el.classList.add('ui-report-action-soft');
  });
}
```

## Estructura Recomendada

### CSS

Agrupar el motion por capas:

```css
/* MOTION TOKENS */
:root {
  --motion-ease: cubic-bezier(.2,.8,.2,1);
  --motion-fast: 180ms;
  --motion-base: 320ms;
  --motion-slow: 520ms;
}

/* SHARED MOTION LAYER */
.ui-reveal { ... }
.ui-tactile { ... }

/* DASHBOARD DETAIL MOTION LAYER */
.ui-feature-card { ... }

/* INSPECTOR DETAIL MOTION LAYER */
.ui-progress-hero-bar { ... }

/* REPORT DETAIL MOTION LAYER */
.ui-report-score-hero { ... }

@keyframes ui-report-sheen { ... }
```

### JS

Separar por zonas:

```js
function initUiMotion(root = document) {}
function initComponentMotion(root = document) {}
function initInspectorDetailMotion(root = document) {}
function initReportDetailMotion(root = document) {}
```

Regla:

- una función por capa o por zona
- cada función marca componentes concretos
- cualquier estado temporal vive en `is-*`

## Reglas De Accesibilidad

Toda animación debe respetar:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

Además:

- no usar motion como único medio para comunicar estado
- mantener contraste alto aunque haya glow o sheen
- no depender de motion para entender una acción
- no usar loops fuertes o parpadeos
- evitar cambios bruscos de escala

## Ejemplo Hero: Reporte Final

El mejor hero del proyecto hoy es el score del reporte final.

### Qué hace

- count-up numérico al aparecer
- sheen suave sobre el contenedor
- settle animation corta al montar

### Por qué funciona

- refuerza el valor principal del reporte
- dura poco
- no compite con la lectura
- sigue siendo entendible sin motion

### Ejemplo CSS

```css
.ui-report-score-hero {
  position: relative;
  overflow: hidden;
}

.ui-report-score-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 16%, rgba(255,255,255,.42) 48%, transparent 78%);
  transform: translateX(-135%);
}

.ui-report-score-hero:hover::before {
  animation: ui-report-sheen 980ms var(--motion-ease);
}

.ui-report-score-value[data-score-animated="true"] {
  animation: ui-report-score-settle 900ms var(--motion-ease);
}
```

### Ejemplo JS

```js
function animateReportScore(el) {
  if (!el || el.dataset.scoreAnimated === 'true') return;
  el.dataset.scoreAnimated = 'true';

  const match = (el.textContent || '').match(/(\d+)\s*\/\s*(\d+)\s*\((\d+)%\)/);
  if (!match) return;

  const score = Number(match[1]);
  const maxScore = Number(match[2]);
  const pct = Number(match[3]);
  const duration = 1100;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent =
      Math.round(score * eased) + ' / ' +
      maxScore + ' (' +
      Math.round(pct * eased) + '%)';

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
```

## Buenas Prácticas

- mantener motion separado de:
  - fetch
  - validaciones
  - guardado
  - scoring
  - exportación

- preferir:
  - una función central de activación
  - clases reutilizables
  - keyframes breves y claros

- evitar:
  - listeners por cada nodo si puede delegarse o centralizarse
  - estilos inline para motion salvo estados muy temporales
  - animaciones infinitas salvo casos realmente útiles y suaves

- revisar siempre:
  - costo visual
  - costo cognitivo
  - costo de performance

## Cómo Agregar Una Nueva Animación

1. Identificar si el componente realmente necesita motion.
2. Definir si será `hero`, `soft`, `live` o `shell`.
3. Crear clases CSS `ui-*` específicas.
4. Si necesita estado temporal, usar `is-*`.
5. Activarla desde una función `init...Motion()`.
6. Respetar `prefers-reduced-motion`.
7. Verificar que siga siendo entendible sin animación.
8. Documentarla en esta guía o en el bloque correspondiente del CSS/JS.

Ejemplo:

```js
function initWarningMotion(root = document) {
  root.querySelectorAll('.warning-pill').forEach((el) => {
    el.classList.add('ui-warning-live');
  });
}
```

## Checklist Antes De Merge

- la animación es opt-in
- no rompe layout
- no cambia lógica de negocio
- respeta `prefers-reduced-motion`
- tiene una duración razonable
- no distrae ni recarga
- no genera listeners innecesarios
- está encapsulada en `init...Motion()`
- tiene nombre consistente
- está documentada si agrega una nueva convención

## Resumen Operativo

Para este proyecto:

- motion se activa desde JS
- motion se implementa con clases `ui-*`
- estados temporales usan `is-*`
- `hero` para foco principal
- `soft` para apoyo
- `live` para estados dinámicos
- no se anima todo, solo lo importante

Si una animación no mejora claridad, feedback o jerarquía, no debería existir.
