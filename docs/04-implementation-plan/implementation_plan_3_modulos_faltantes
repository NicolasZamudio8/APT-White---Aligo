# Plan de Acción: Adición de Módulos C2 (Playbooks, Mapa, y Configuración)

Este plan detalla la arquitectura e implementación para completar el frontend del C2 basándonos en la estructura de la rama `Liliana`.

## Proposed Changes

### Backend (FastAPI Simulator)

#### [MODIFY] [main.py](file:///d:/APT-White---Aligo/backend/main.py)
Añadiremos los siguientes endpoints e inyectaremos lógica de almacenamiento en memoria para dar soporte a las nuevas vistas:
- `/api/playbooks` (GET, POST, PUT, DELETE, POST /execute, GET /executions)
- `/api/agents/locations` (GET)
- `/api/config` (GET, PUT)
- `/api/system/status` (GET)
- `/api/system/logs` (GET, DELETE, POST /diagnostics)

### Frontend (React + TS + Tailwind)

#### [NEW] [playbookStore.ts](file:///d:/APT-White---Aligo/frontend/src/store/playbookStore.ts)
#### [NEW] [mapStore.ts](file:///d:/APT-White---Aligo/frontend/src/store/mapStore.ts)
#### [NEW] [settingsStore.ts](file:///d:/APT-White---Aligo/frontend/src/store/settingsStore.ts)
Zustand stores para encapsular el estado global de cada módulo.

#### [NEW] [playbooks.ts](file:///d:/APT-White---Aligo/frontend/src/api/playbooks.ts)
#### [NEW] [map.ts](file:///d:/APT-White---Aligo/frontend/src/api/map.ts)
#### [NEW] [settings.ts](file:///d:/APT-White---Aligo/frontend/src/api/settings.ts)
Funciones de consumo de API rest.

#### [MODIFY] [App.tsx](file:///d:/APT-White---Aligo/frontend/src/App.tsx)
Actualizar las rutas estáticas e importar las nuevas páginas.

#### [MODIFY] [Sidebar.tsx](file:///d:/APT-White---Aligo/frontend/src/components/layout/Sidebar.tsx)
Vincular el menú correctamente con las rutas `/playbooks`, `/map`, `/settings`.

#### [NEW] [Playbooks.tsx](file:///d:/APT-White---Aligo/frontend/src/pages/Playbooks.tsx)
Página principal de playbooks que renderiza el listado, busca, filtra y despliega el modal de creación.

#### [NEW] [PlaybookEditor.tsx](file:///d:/APT-White---Aligo/frontend/src/pages/PlaybookEditor.tsx)
Modal/formulario interactivo para crear y editar pasos del playbook, retrasos, y agentes objetivos.

#### [NEW] [Map.tsx](file:///d:/APT-White---Aligo/frontend/src/pages/Map.tsx)
Página que muestra un mapa interactivo. Para evitar problemas de instalación de Leaflet o carga lenta de mapas Leaflet (que pueden requerir librerías pesadas o llaves), implementaremos un mapa SVG premium vectorial de Colombia/Suramérica interactivo y animado, donde los marcadores de agentes se geolocalizan de forma visualmente atractiva con micro-animaciones (pulsos de radar). Esto garantiza estabilidad 100% en localhost y en producción sin requerir conexión a internet.

#### [NEW] [Settings.tsx](file:///d:/APT-White---Aligo/frontend/src/pages/Settings.tsx)
Página de configuración dividida en pestañas funcionales (Seguridad, Comunicación, Logs, Agentes, Tema/Interfaz y Diagnóstico de sistema en vivo con medidores de memoria/uptime).

## Verification Plan

### Automated/Manual Tests
- Verificar la correcta compilación y transpilación con Vite.
- Validar flujo de guardado de un Playbook, adición de pasos, y ejecución simulada.
- Probar el cambio de pestañas de configuración y la geolocalización simulada en el mapa SVG.
