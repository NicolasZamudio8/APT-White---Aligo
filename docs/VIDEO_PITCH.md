# Pitch Video Demo - Aligo C2 Platform

**Duración objetivo:** 3-7 minutos  
**Formato:** Grabación de pantalla con narración en vivo  
**Objetivo:** Demostrar el C2 en funcionamiento extremo a extremo

---

## Estructura del Video

### 0:00 - 0:45 | Introducción y Arquitectura (45s)

**Visual:** Pantalla dividida o transiciones rápidas entre:
- Terminal con backend iniciándose
- Frontend cargando en navegador
- Diagrama de arquitectura (opcional, superpuesto)

**Narración:**
> "Aligo C2 Platform es una plataforma de comando y control de grado empresarial para simulación de adversarios. Arquitectura cliente-servidor desacoplada: frontend React con mapa táctico D3.js, backend FastAPI con WebSocket para agentes, y persistencia en Neon PostgreSQL. Integración nativa con Google Gemini para asistentes de IA."

**Acciones en pantalla:**
- Mostrar terminal: `cd backend && python main.py`
- Mostrar logs de inicialización de base de datos
- Mostrar frontend: `cd frontend && pnpm run dev`
- Navegar a `http://localhost:1700`

---

### 0:45 - 1:30 | Inicialización del Sistema (45s)

**Visual:** Dashboard principal con métricas

**Narración:**
> "Al iniciar el servidor, se inicializa el esquema relacional de 9 tablas y se siembran 33 agentes de demo distribuidos en Colombia. El sistema configura automáticamente claves de cifrado XOR-256, redirectores de red, y playbooks MITRE ATT&CK predefinidos."

**Acciones en pantalla:**
- Mostrar logs de backend: "Initializing database schema...", "Seeding 33 agents..."
- Mostrar Dashboard con estadísticas: "Agentes Online: 28/36", "Comandos Ejecutados: 0"
- Resaltar panel de distribución por SO (Windows/Linux)

---

### 1:30 - 2:30 | Conexión de 3 Agentes (60s)

**Visual:** Mapa táctico con agentes apareciendo

**Narración:**
> "Ahora vamos a conectar 3 agentes simulados. Cada agente genera un ID dinámico, se conecta vía WebSocket cifrado, y aparece como nodo online en el mapa táctico. Los agentes implementan reconexión adaptativa con backoff exponencial."

**Acciones en pantalla:**
- Abrir 3 terminales separadas
- Ejecutar en cada: `python mock_agent.py`
- Mostrar logs de conexión: "Connected to ws://localhost:8000/ws/ag-xxx"
- En el frontend, ver aparecer 3 nuevos nodos con pulso verde
- Zoom en un nodo: mostrar ID, IP, ciudad, estado online

---

### 2:30 - 4:00 | Ejecución de Comandos E2E (90s)

**Visual:** Modo Dron con payload cards y nodos tácticos

**Narración:**
> "El operador puede despachar comandos mediante drag-and-drop de payloads tácticos: Recon para enumeración, Dump para credenciales, Beacon para persistencia, Exfil para exfiltración. Los comandos se cifran con PSK antes de transmitirse por WebSocket."

**Acciones en pantalla:**
- Cambiar a "Modo Dron"
- Mostrar panel de Payload Cards (Recon, Dump, Beacon, Exfil)
- Arrastrar payload "Recon" sobre agente 1
- Mostrar modal de alerta de vulnerabilidad con recomendación IA
- Ver nodo cambiar a color ámbar (RECON)
- Arrastrar payload "Dump" sobre agente 2
- Ver nodo cambiar a color púrpura (DUMP)
- Arrastrar payload "Exfil" sobre agente 3
- Ver nodo cambiar a color rojo (EXFIL)

**Narración continua:**
> "Cada comando se registra en la base de datos con timestamp, categoría de ataque MITRE, y resultado. El sistema dispara eventos personalizados para alimentar el monitor de red TShark y el asistente de IA."

**Acciones en pantalla:**
- Mostrar panel "Últimas ejecuciones" con logs
- Abrir modal TShark: mostrar capturas de red simuladas
- Mostrar asistente IA: "Attack detected: RECON on ag-bog-1. Recommendation: Investigate process enumeration..."

---

### 4:00 - 5:00 | Playbook Multihost (60s)

**Visual:** Página de Playbooks con ejecución en progreso

**Narración:**
> "Aligo soporta automatización mediante playbooks multihost. Un playbook define una secuencia de comandos con delays y tácticas MITRE ATT&CK. Se ejecuta en múltiples agentes en paralelo con auditoría completa."

**Acciones en pantalla:**
- Navegar a página /playbooks
- Seleccionar playbook "Persistence Scan"
- Seleccionar 3 agentes conectados
- Click "Ejecutar Playbook"
- Mostrar progreso en tiempo real: "Step 1/3 completed", "Step 2/3 in progress"
- Ver logs de ejecución por agente
- Mostrar estado final: "Completed" con timestamp

---

### 5:00 - 5:45 | Persistencia y Telemetría (45s)

**Visual:** Configuración y logs del sistema

**Narración:**
> "Toda la telemetría persiste en Neon PostgreSQL: agentes, ejecuciones, playbooks, claves criptográficas, redirectores de red. El sistema mantiene auditoría completa en system_logs y network_packets para análisis forense."

**Acciones en pantalla:**
- Navegar a /settings
- Mostrar configuración: modo drone, departamento filtrado, intervalo de balizas
- Mostrar tabla de crypto keys con rotación de claves
- Mostrar tabla de redirectors con topología distributiva
- Volver al mapa: mostrar filtro por departamento (ej: "Cundinamarca")

---

### 5:45 - 6:30 | Innovación y Diferenciadores (45s)

**Visual:** Comparativa o features destacadas

**Narración:**
> "Lo que hace innovador a Aligo: integración nativa de IA para análisis de ataques en tiempo real, mapa táctico con visualización geográfica D3.js, persistencia relacional serverless con Neon, cifrado XOR-256 en canal WebSocket, y diseño premium glassmorphism para operadores de ciberseguridad."

**Acciones en pantalla:**
- Mostrar asistente IA respondiendo pregunta: "Analiza patrón de ataques recientes"
- Mostrar mapa con animaciones de pulso y colores por tipo de ataque
- Mostrar panel TShark con capturas en vivo
- Resaltar diseño UI: paneles tácticos, efectos glassmorphism

---

### 6:30 - 7:00 | Cierre y Call to Action (30s)

**Visual:** Dashboard completo con todos los componentes

**Narración:**
> "Aligo C2: plataforma completa para simulación de adversarios con arquitectura moderna, persistencia robusta, y asistencia de IA. Código fuente disponible en GitHub con documentación técnica completa."

**Acciones en pantalla:**
- Mostrar repositorio GitHub en navegador
- Mostrar README con instrucciones de despliegue
- Mostrar documentación técnica en docs/
- Pantalla final: logo Aligo con URL del repo

---

## Checklist de Preparación

### Antes de Grabar

- [ ] Backend iniciado: `cd backend && python main.py`
- [ ] Frontend iniciado: `cd frontend && pnpm run dev`
- [ ] Base de datos Neon configurada en `.env`
- [ ] GEMINI_API_KEY configurada (opcional, para demo IA)
- [ ] 3 terminales listas para ejecutar `mock_agent.py`
- [ ] Navegador en `http://localhost:1700`
- [ ] Limpiar cache del navegador (Ctrl+Shift+R)
- [ ] Verificar que no haya errores en consola del navegador

### Durante la Grabación

- [ ] Usar micrófono de buena calidad
- [ ] Hablar claro y a ritmo moderado
- [ ] Hacer pausas entre secciones
- [ ] Zoom en elementos importantes
- [ ] Mostrar cursor en acciones clave
- [ ] Mantener terminal visible en un lado de la pantalla

### After Recording

- [ ] Editar cortes innecesarios
- [ ] Agregar subtítulos opcionales
- [ ] Añadir música de fondo sutil (opcional)
- [ ] Exportar en formato MP4 1080p
- [ ] Subir a YouTube/Vimeo con descripción del repo

---

## Script Rápido (Bullet Points)

**Intro (45s)**
- Arquitectura: Frontend React + Backend FastAPI + Neon PostgreSQL
- WebSocket para agentes, IA Gemini integrada

**Setup (45s)**
- Inicialización automática de DB y seed de 33 agentes
- Dashboard con métricas en vivo

**Conexión Agentes (60s)**
- 3 terminales con mock_agent.py
- Conexión WebSocket cifrada
- Nodos aparecen en mapa con pulso verde

**Comandos E2E (90s)**
- Modo Dron con payload cards
- Drag-and-drop: Recon, Dump, Beacon, Exfil
- Nodos cambian color por tipo de ataque
- Modal alerta vulnerabilidad + IA
- TShark captures en vivo

**Playbooks (60s)**
- Ejecución multihost automatizada
- Progreso step-by-step
- Auditoría completa en DB

**Persistencia (45s)**
- Neon PostgreSQL serverless
- 9 tablas relacionales
- Crypto keys, redirectors, logs

**Innovación (45s)**
- IA para análisis de ataques
- Mapa táctico D3.js
- Cifrado XOR-256
- Diseño premium glassmorphism

**Cierre (30s)**
- Repo GitHub con docs
- README con instrucciones
- Documentación técnica completa

---

## Tips de Grabación

1. **Resolución:** 1920x1080 mínimo
2. **Framerate:** 30fps suficiente
3. **Audio:** Sin ruido de fondo, voz clara
4. **Pantalla:** Modo oscuro para mejor contraste
5. **Cursor:** Visible, movimientos fluidos
6. **Zoom:** Usar zoom del sistema para detalles pequeños
7. **Errores:** Si ocurren, mantener calma y explicar cómo se resuelven (muestra robustez)
