<div align="center">

```text
  ██████╗ ██████╗ ███████╗███╗   ██╗     █████╗ ██╗   ██╗██████╗ ██╗████████╗ ██████╗ ██████╗
 ██╔═══██╗██╔══██╗██╔════╝████╗  ██║    ██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝██╔═══██╗██╔══██╗
 ██║   ██║██████╔╝█████╗  ██╔██╗ ██║    ███████║██║   ██║██║  ██║██║   ██║   ██║   ██║██████╔╝
 ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║    ██╔══██║██║   ██║██║  ██║██║   ██║   ██║   ██║██╔══██╗
 ╚██████╔╝██║     ███████╗██║ ╚████║    ██║  ██║╚██████╔╝██████╔╝██║   ██║   ╚██████╔╝██║  ██║
  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

**La herramienta de auditorías definitiva que siempre quisiste: rápida, 100% local, infinitamente personalizable y sin fricciones.**

[![Status](https://img.shields.io/badge/status-active-22c55e?style=for-the-badge)](.)
[![License](https://img.shields.io/badge/license-MIT-6366f1?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-84cc16?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/backend-Express-000000?style=for-the-badge&logo=express)](.)
[![Vanilla JS](https://img.shields.io/badge/frontend-Vanilla%20JS-f59e0b?style=for-the-badge&logo=javascript&logoColor=black)](.)
[![Sin Cloud](https://img.shields.io/badge/cloud-ninguno%20☁️-ef4444?style=for-the-badge)](.)

</div>

---

## 🚀 ¿Qué es OPEN AUDITOR?

¿Cansado de pagar licencias astronómicas por software corporativo lento, engorroso y dependiente de la nube? **OPEN AUDITOR** es tu respuesta.

Es una aplicación web **totalmente local** para crear, gestionar y ejecutar auditorías e inspecciones de nivel profesional. Corre enteramente en tu máquina: sin cuentas, sin suscripciones mensuales, sin necesidad de conexión a internet. **Tus datos son 100% tuyos — siempre.**

Diseñada meticulosamente para auditores, inspectores, prevencionistas de riesgos, ingenieros de calidad y equipos de terreno que necesitan una herramienta seria, ágil y poderosa.

```
Descargar → Instalar → Ejecutar → Auditar. Todo en menos de 1 minuto.
```

---

## ⚡ Instalación Rápida (¡Empieza a auditar en segundos!)

Solo necesitas tener [Node.js](https://nodejs.org/) instalado en tu computadora.

### Opción 1: Modo Clásico (Para desarrolladores y curiosos)
Abre tu terminal favorita y ejecuta:

```bash
# 1. Clonar el repositorio a tu máquina
git clone https://github.com/tu-usuario/open-auditor.git

# 2. Entrar a la carpeta del proyecto
cd open-auditor

# 3. Instalar las dependencias (solo toma unos segundos)
npm install

# 4. ¡Arrancar la magia!
npm start
```

### Opción 2: Modo Desarrollo (Para los que quieren modificar código)
```bash
npm run dev
```

Una vez que el servidor arranque, abre tu navegador web favorito y entra a:
👉 **[http://localhost:3001](http://localhost:3001)**

Verás un hermoso panel de control listo para crear tu primera plantilla. La consola te mostrará exactamente dónde se están guardando tus datos localmente (generalmente en `AppData/Local/open-auditor-nodejs/Data` en Windows).

---

## 🔥 Características Estrella (Por qué OPEN AUDITOR es increíble)

OPEN AUDITOR no es solo un formulario glorificado; es un ecosistema completo de auditoría empaquetado en una app ultraligera.

### 🏗️ Constructor de Plantillas Drag & Drop
Crea estructuras complejas e infinitas sin sudar una gota:
- **Jerarquía Infinita:** Páginas → Secciones → Preguntas.
- **Secciones Repetibles (¡NUEVO!):** ¿Necesitas auditar 5 vehículos iguales o 10 extintores en la misma inspección? Crea una sección repetible, define un mínimo y máximo de instancias, ¡y listo! Cada instancia se etiqueta automáticamente de forma correlativa.
- **Instrucciones por Pregunta (¡NUEVO!):** Añade textos de ayuda detallados para tus inspectores. Configúralos para que estén siempre visibles o se desplieguen solo cuando hagan clic en el ícono de ayuda `ℹ️`.
- **Lógica Condicional Real:** "Si responde NO a la pregunta 3, mostrar la pregunta 4 de justificación". Sin escribir una sola línea de código.

### 💯 Puntuación y Scoring Automático
Olvídate de las hojas de Excel con fórmulas rotas. Asigna pesos y valores a cada respuesta:
- `Conforme` = 10 puntos, `No Conforme` = 0 puntos, `N/A` = Excluido de la suma.
- OPEN AUDITOR calcula automáticamente el score final de la auditoría en tiempo real y genera un hermoso gráfico de evolución histórica para cada plantilla.

### 📱 Ejecución Impecable (Incluso en Tablets)
- **Auto-guardado continuo:** Cada 30 segundos tu progreso está seguro. Se te corta la luz, se te cierra el navegador... no importa, retomas exactamente donde estabas.
- **Modo Kiosco:** Oculta toda la interfaz sobrante para concentrarte 100% en la inspección de campo en tu iPad o tablet Android.
- **Escaneo QR:** Genera un código QR de tu plantilla, escanéalo con tu tablet conectada al mismo WiFi y empieza a auditar caminando por la planta.

### 🔢 Numeración Correlativa Inteligente (¡NUEVO!)
Dale un aspecto corporativo oficial a tus reportes. Configura un número automático de inspección por plantilla (Ej: `SSOMA-2026-001`, `SSOMA-2026-002`). El correlativo avanza automáticamente y se imprime gloriosamente en la portada de los PDFs y en el asunto de los correos.

### 🔍 Búsqueda Global Omnipresente (¡NUEVO!)
¿No recuerdas en qué inspección dejaste esa nota sobre "válvula oxidada"? ¡Búscalo! El nuevo motor de búsqueda global rastrea instantáneamente entre nombres de plantillas, preguntas de formularios, respuestas ingresadas, notas, acciones correctivas e IDs de inspección.

### 📸 Multimedia, Hallazgos y Acciones
No te limites a marcar casillas. Por cada ítem puedes:
- Tomar/Subir fotografías que se incrustarán en los reportes.
- Añadir notas largas de observación.
- Levantar "Banderas rojas" (🚩 Señalar hallazgos críticos).
- Asignar una **Acción Correctiva** inmediata con responsable y fecha límite.

Al finalizar, puedes gestionar TODAS las acciones correctivas de todas las auditorías en un panel centralizado (`/actions`), cambiando su estado de *Abierta* a *Cerrada*.

---

## 📄 Reportes que Enamoran a la Gerencia

Hacer la auditoría es solo la mitad del trabajo. La otra mitad es reportarlo. OPEN AUDITOR automatiza esto maravillosamente:

1. **Firma Digital en Pantalla:** Al terminar, el auditor firma con el mouse o el dedo directamente en el navegador.
2. **Exportación a PDF Estructurado:** Con un clic, obtén un PDF formateado profesionalmente con portada, resumen de puntajes, índice, preguntas, respuestas coloreadas y todas las fotografías anexadas.
3. **PDF de Hallazgos (El reporte ejecutivo):** ¿A tu jefe no le importan las 200 preguntas que salieron bien? Exclúyelas. Genera un PDF que contenga *únicamente* los hallazgos señalados con rojo y las acciones correctivas a tomar.
4. **Excel (.xlsx) y CSV:** Todos los datos tabulados perfectamente en Excel nativo. Si usaste **Secciones Repetibles**, ¡el exportador de Excel inteligentemente les asigna su propia pestaña/hoja separada para no romper la matriz de datos!

---

## 💾 Tus Datos, Tus Reglas (Privacidad Absoluta)

En una época donde todo va a la nube de un tercero, OPEN AUDITOR es un soplo de aire fresco para la seguridad de la información corporativa.

Los datos se guardan en simples archivos JSON en tu máquina local:
- **Windows:** `%LOCALAPPDATA%\open-auditor-nodejs\Data\`
- **macOS:** `~/Library/Application Support/open-auditor-nodejs/`
- **Linux:** `~/.local/share/open-auditor-nodejs/`

¿Quieres hacer backup? Simplemente copia esa carpeta en un pendrive.
¿Quieres compartir las inspecciones con tu equipo a través de la red local o sincronizarlas a un OneDrive/Google Drive corporativo? Simplemente abre los **⚙️ Ajustes** en la app y cambia la ruta del directorio de datos al disco de red que prefieras.

---

## 📦 Requerimientos y Dependencias Exactas

Para funcionar, OPEN AUDITOR requiere lo siguiente:

### Requisitos del Sistema (Prerrequisitos)
- **Node.js**: `v18.0.0` o superior (Recomendado versión LTS).
- **NPM**: `v9.0.0` o superior (Se instala automáticamente junto con Node.js).
- **Sistema Operativo**: Compatible con Windows 10/11, macOS y distribuciones modernas de Linux.
- Espacio en disco: Al menos 500 MB libres (principalmente por los binarios de Chromium que utiliza Puppeteer).

### Bibliotecas Backend (`dependencies` en package.json)
El servidor utiliza un set cuidadosamente curado de bibliotecas ultra-confiables y ligeras:

```json
{
  "express": "^4.18.0",       // Servidor HTTP robusto y rápido.
  "uuid": "^9.0.0",           // Generación de IDs únicos e irrepetibles para plantillas y respuestas.
  "multer": "^1.4.5-lts.1",   // Middleware para la carga de archivos multipart/form-data (Manejo de fotos y evidencias).
  "puppeteer": "^21.0.0",     // Renderizado de archivos PDF píxel-perfect a partir de HTML (Descarga Chromium internamente).
  "env-paths": "^3.0.0",      // Resolución de rutas persistentes seguras según el sistema operativo (AppData, Application Support, etc).
  "exceljs": "^4.4.0",        // Generación nativa de reportes XLSX para Excel sin requerir Office instalado.
  "node-notifier": "^10.0.1", // Notificaciones nativas de escritorio al iniciar el servidor (Windows, Mac, Linux).
  "qrcode": "^1.5.4"          // Generación de códigos QR en base64 para acceder rápidamente a la auditoría desde un móvil/tablet en la red local.
}
```

### Bibliotecas de Desarrollo (`devDependencies`)
- `nodemon` (`^3.0.0`): Utilizado exclusivamente para auto-reiniciar el servidor durante el desarrollo al modificar código.

> 💡 **Nota Importante:** El Frontend es 100% puro. **No utiliza** React, Vue, Angular, Svelte, Tailwind, jQuery ni ninguna otra biblioteca de cliente. Carga en microsegundos porque envía HTML, CSS y Vanilla JS nativo directo al navegador.

---

## 🛠️ Arquitectura Minimalista y Elegante

Monolítica y sin fricción. Sin React, sin Vue, sin pesadas bases de datos SQL/NoSQL que requieran instalación, sin Docker.

- **Frontend:** Vanilla JS, HTML semántico y variables CSS limpias. (Cero carga, hiper-responsivo).
- **Backend:** Node.js con Express.
- **Base de Datos:** Archivos JSON atómicos (Portable, editable por humanos).
- **Motores Gráficos:** Puppeteer (para PDF Pixel-Perfect) y ExcelJS (Para XLSX nativos).

---

## 🤝 Únete a la Revolución de las Auditorías Libres

Este proyecto está vivo, respira y mejora cada día gracias a la filosofía Open Source. ¡Y tú puedes ser parte!
El código es tan claro y sin frameworks que cualquiera que sepa un poco de Javascript puede añadir funcionalidades.

**¿Qué nos depara el futuro? (Roadmap propuesto):**
- 🌍 Internacionalización (Soporte Multi-idioma).
- 📊 Dashboard avanzado de analíticas (PowerBI-style) sobre las acciones correctivas.
- 🎨 Modo Oscuro (Dark Theme) para inspecciones nocturnas.
- 📦 Importación/Exportación masiva en archivo .zip (JSON + Fotos empaquetadas).

¿Encontraste un bug? ¿Tienes una idea brillante? ¡Abre un *Issue* o lanza un *Pull Request* ahora mismo!

---

<div align="center">
  <h3>Construido con frustración hacia el software corporativo caro, y con amor absoluto hacia las herramientas que simplemente funcionan.</h3>
  <p>Distribuido bajo Licencia MIT.</p>
</div>
