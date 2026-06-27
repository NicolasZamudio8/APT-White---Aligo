# Walkthrough: Simulador de Command & Control (C2) - MVP Completo

¡MVP Completo! Hemos finalizado la integración y el desarrollo de los módulos de la rama `Liliana` con el backend, implementando el simulador de **Playbooks**, el **Mapa Táctico SVG** de geolocalización de agentes y el panel de **Configuración & Diagnóstico**. 

---

## 🛠️ ¿Qué se ha implementado en esta fase?

### 1. Librería de Playbooks (Automatización)
- **Gestor Visual de Pasos:** Permite diseñar flujos ordenados de comandos, definiendo retardos específicos (delay) en segundos por instrucción.
- **Orquestación Asíncrona:** El backend ejecuta en segundo plano los pasos de forma concurrente, permitiendo al operador seguir usando la interfaz.
- **Monitoreo de Progreso en Vivo:** Barra de progreso y logs detallados por paso actualizados por sondeo en tiempo real.

### 2. Mapa Táctico de Geolocalización (SVG de Colombia)
- **Radar Cyberpunk Táctico:** Diseñado localmente usando un SVG vectorial de Colombia con cuadrículas tácticas, barridos rotatorios y pings palpitantes sobre los nodos.
- **Proyección de Coordenadas Reales:** Las coordenadas de latitud/longitud de los agentes se proyectan matemáticamente sobre el lienzo SVG para ubicarlos en sus ciudades correspondientes (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga).
- **Inspección de Nodos:** Al hacer clic en un nodo se despliega telemetría detallada del agente con acceso rápido de intercesión al terminal.

### 3. Configuración del Sistema & Auditoría
- **Telemetría de Servidor en Vivo:** Medidores de CPU, RAM del backend C2 y Uptime del servidor en tiempo real.
- **Consola de Diagnóstico E2E:** Botón que dispara una auditoría secuencial de la base de datos Neon DB, certificados TLS y handshakes, emitiendo logs estructurados.
- **Historial de Logs:** Historial de logs internos para auditoría de acciones del C2.

### 4. Integración Real de Gemini API Copilot
- **Conectividad Real:** El chat de IA consulta el endpoint `/api/ai/chat` que a su vez se comunica con Gemini API (`gemini-1.5-flash`) de forma real si la API Key está configurada en el `.env`, cayendo elegantemente a un modelo local si el canal está inactivo.

---

## 📹 Demostración Visual del Sistema

Para validar la compilación y la visualización de la interfaz, el browser subagent ha navegado por la aplicación y guardado las siguientes evidencias:

````carousel
![Dashboard General de Agentes](/C:/Users/nicolas.zamudio/.gemini/antigravity-ide/brain/6fec5ef4-c315-4ebf-bf9d-5c295200fdc3/dashboard_page_1782527946446.png)
<!-- slide -->
![Librería de Playbooks de Automatización](/C:/Users/nicolas.zamudio/.gemini/antigravity-ide/brain/6fec5ef4-c315-4ebf-bf9d-5c295200fdc3/playbooks_page_1782527960185.png)
<!-- slide -->
![Mapa Táctico Vectorial de Colombia](/C:/Users/nicolas.zamudio/.gemini/antigravity-ide/brain/6fec5ef4-c315-4ebf-bf9d-5c295200fdc3/mapa_page_1782527970606.png)
<!-- slide -->
![Panel de Configuración y Diagnóstico de Telemetría](/C:/Users/nicolas.zamudio/.gemini/antigravity-ide/brain/6fec5ef4-c315-4ebf-bf9d-5c295200fdc3/configuracion_page_1782527981782.png)
<!-- slide -->
![Video Grabación del Recorrido de Interfaz](/C:/Users/nicolas.zamudio/.gemini/antigravity-ide/brain/6fec5ef4-c315-4ebf-bf9d-5c295200fdc3/c2_dashboard_mvp_visualisation_1782527902410.webp)
````

---

## 🚀 Cómo Ejecutar el Proyecto Completo

Las tareas ya están corriendo de forma continua en tu workspace:
- **Frontend Vite:** Disponible en [http://localhost:1700](http://localhost:1700)
- **Backend FastAPI:** Corriendo en [http://localhost:8000](http://localhost:8000)
- **Agentes Simulados (Mock Agents):** 2 instancias en ejecución y enlazadas vía WebSockets.

Para verificar que todo funcione en vivo:
1. Accede a [http://localhost:1700](http://localhost:1700) en tu navegador.
2. Comprueba que el Dashboard registre 2 agentes conectados.
3. Ve a la pestaña **Playbooks**, selecciona un playbook (ej. "Reconocimiento Inicial"), haz clic en **Lanzar**, marca ambos agentes y confirma. Verás el progreso de los comandos asíncronos y sus retardos en la barra.
4. Ve a la pestaña **Mapa** y pulsa los nodos de Bogotá o Barranquilla para ver su estado e IP.
5. Ve a **Configuración -> Diagnósticos en Vivo** y ejecuta un diagnóstico de sistema para auditar la base de datos Neon DB y TLS.
