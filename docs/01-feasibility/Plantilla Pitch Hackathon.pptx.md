# Plantilla Pitch Hackathon — Aligo C2 (APT-White)

> **Archivo original:** `Plantilla Pitch Hackathon.pptx`
> **Tipo:** Presentation (PPTX)
> **Diapositivas:** 9
> **Conversión & Llenado:** Completado y detallado con la propuesta de valor de la plataforma Aligo C2.

---

## Slide 1 — Presentación
### **Aligo C2 — Innovation in Every Shade**
*Orquestación Inteligente y Evasiva de Emulación de Adversarios de Grado Militar.*

- **Proyecto:** Plataforma de Comando y Control (C2) de Nueva Generación.
- **Equipo:** APTWhite
- **Integrantes:** Sebastian Ortiz, Liliana Jiménez, Juan Jose Garcia, Nicolas Andres Zamudio, Kevin Cuervo.

---

## Slide 2 — El Problema
### **La Brecha de Realismo en la Emulación de Amenazas Avanzadas (APTs)**
- **Falta de Persistencia**: Las herramientas tradicionales de simulación de adversarios son volátiles. Si el servidor se apaga o se recarga la página, se pierden los logs tácticos y el estado del mapa.
- **Falta de Trazabilidad Forense**: Los analistas y operadores de ciberseguridad carecen de capturas de red persistentes para correlacionar los pings y balizas (beacons) de los agentes comprometidos.
- **Infraestructura Rígida**: Las plataformas C2 estándar no permiten configurar de manera visual o interactiva el encadenamiento de proxies (redirectores) ni la rotación criptográfica dedicada por host.

---

## Slide 3 — Contexto de Negocio e Infraestructura
### **El Desafío de Simulación en Infraestructuras Distribuidas**
- **Complejidad Geográfica**: Necesidad de monitorear y emular incidentes distribuidos a nivel nacional (abarcando los 33 departamentos de Colombia).
- **Inspección de Tráfico**: Los sistemas IDS/IPS detectan flujos C2 directos. Se requiere simular topologías de red realistas usando proxies de salto secundario (Uplinks) para evadir perímetros de seguridad.
- **Cumplimiento y Regulación**: Rigurosidad en el cifrado del canal de control. En una operación real, el uso de llaves estáticas expone la infraestructura; se requiere rotación de claves en caliente de forma intuitiva.

---

## Slide 4 — La Solución General
### **Aligo C2: Plataforma Táctica Resiliente**
- **Plano Táctico Interactivo**: Mapa geográfico reactivo (D3.js) que geolocaliza agentes con actualizaciones de latencia y estado (online/offline) en tiempo real mediante WebSockets seguros.
- **Persistencia en la Nube (Neon PostgreSQL)**: Toda acción, desde un cambio en el filtrado de región hasta una ejecución de comandos, se almacena de manera transaccional libre de ciclos en una base de datos relacional serverless.
- **Integración Forense de Red (TShark)**: Consola de captura de red embebida y totalmente persistente en base de datos. Los paquetes e inyecciones de ataques se conservan y listan al recargar la página.

---

## Slide 5 — Prototipo a Detalle (Demostración de Control)
### **Control Total e Interactividad en un Solo Panel**
- **Acciones Drag & Drop**: Arrastre y suelte de payloads (RECON, DUMP, BEACON, EXFIL) clasificados bajo el framework MITRE ATT&CK sobre nodos específicos o ejecución masiva regional.
- **Consola Interactiva**: Terminal Web conectada al WebSocket del agente simulado para ejecutar comandos reales del host.
- **Rotación Criptográfica y Ruteo Dinámico**: Dropdowns interactivos para reasignar llaves de encriptación y proxies de tráfico individuales por agente con efecto inmediato.

---

## Slide 6 — Tecnologías Utilizadas
### **Stack Tecnológico Moderno y Copilot de IA**
- **Backend**: FastAPI (Python), SQLAlchemy 2.0, Uvicorn, Websockets.
- **Base de Datos**: Neon PostgreSQL (Serverless, conexión cifrada SSL, pooling pre-ping).
- **Frontend**: React 18 (TypeScript), Zustand (Manejo de estados), D3.js (Proyecciones SVG del mapa), Lucide React.
- **Copilot IA (Google Gemini 3.5 Flash)**:
  - Generación inteligente de Playbooks desde intenciones en lenguaje natural.
  - Decodificación y análisis forense de logs crudos del host a español con un solo botón.
  - Guardrails heurísticos contra inyección de comandos destructivos en el chat.

---

## Slide 7 — Seguridad y Arquitectura de Datos
### **DevSecOps y Cumplimiento Relacional**
- **Modelo de Base de Datos Aclíclico**: Estructura de 9 tablas relacionadas de forma lógica para máxima trazabilidad de auditoría, eliminando FK circulares.
- **Zero Hardcoding**: Aislamiento estricto de secretos y credenciales de base de datos en variables de entorno (`.env`).
- **Resiliencia C2**: Agentes robustos con política de reconexión adaptativa por backoff exponencial y descifrado XOR simétrico en el endpoint.

---

## Slide 8 — Modelo de Crecimiento
### **Escalabilidad y Adopción en el Mercado de Ciberseguridad**
- **Arquitectura Cloud Native**: Preparado para contenerización (Dockerfiles provistos) y despliegue rápido en Google Cloud Run y Azure Container Apps.
- **Estrategia Comercial**: Enfoque B2B para emulación de amenazas y entrenamientos de Red Team/Blue Team en entidades financieras, gubernamentales e infraestructuras críticas en LATAM.
- **Fidelización y Comunidad**: Soporte para importación/exportación de playbooks en formato YAML (alineados a estándares open-source) facilitando la adopción comunitaria.

---

## Slide 9 — Call to Action
### **¡Únete a la Innovación en Ciberseguridad!**
- **Prueba el Demo Online**: `https://apt-white-aligo-production.up.railway.app/`
- **Revisa el Repositorio de Código**: `https://github.com/NicolasZamudio8/APT-White---Aligo`
- **Contáctanos**: Equipo **APTWhite** — *Defensores Informáticos de la Hackathon*.