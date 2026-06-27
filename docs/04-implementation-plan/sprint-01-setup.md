# Fase 1 — Arquitectura y Setup (Horas 1 - 12)

## Información de la Fase
- Duración: 12 horas
- Enfoque: Infraestructura y Modelos de Datos

## Objetivo
Desplegar la infraestructura base en GCP (Cloud Run y Networking), inicializar la base de datos en Neon, y estructurar el repositorio con las dependencias iniciales para el Frontend (React) y Backend (FastAPI).

## Tasks (Mínimo 15)

### Backend y Base de Datos (Juan José & Nicolás)
- [ ] **TASK-01-01**: Inicializar repositorio Python para Backend (FastAPI).
- [ ] **TASK-01-02**: Crear archivo equirements.txt con astapi, uvicorn, syncpg, google-generativeai.
- [ ] **TASK-01-03**: Configurar conexión a la base de datos Neon usando DATABASE_URL desde .env.
- [ ] **TASK-01-04**: Ejecutar script DDL en Neon para crear tablas gents, 	asks y esults.
- [ ] **TASK-01-05**: Crear modelo de datos en Python usando Pydantic para validación.

### Infraestructura GCP (Juan José)
- [ ] **TASK-01-06**: Crear Artifact Registry en GCP para almacenar imágenes Docker.
- [ ] **TASK-01-07**: Escribir Dockerfile base para el Backend de FastAPI.
- [ ] **TASK-01-08**: Configurar servicio Cloud Run preliminar (dummy hello-world).
- [ ] **TASK-01-09**: Configurar Cloud Load Balancer (WAF) delante de Cloud Run para ofuscación.

### Agente Core (Sebastián)
- [ ] **TASK-01-10**: Crear script base de Agente en Python (esqueleto WSS).
- [ ] **TASK-01-11**: Integrar librería websockets o socketio en el agente.
- [ ] **TASK-01-12**: Implementar lógica de reconexión automática (backoff exponencial).
- [ ] **TASK-01-13**: Implementar recolección de metadata inicial (hostname, OS, IP local).

### Frontend (Liliana)
- [ ] **TASK-01-14**: Ejecutar 
px create-react-app c2-dashboard (o vite).
- [ ] **TASK-01-15**: Configurar Dockerfile para el Frontend React (Nginx).

## Criterios de Verificación
- [ ] API de FastAPI devuelve 200 OK en endpoint /health.
- [ ] Tablas creadas correctamente en base de datos Neon.
- [ ] Imagen de Backend subida a Artifact Registry.
- [ ] Agente Python logra hacer un handshake WSS local exitoso con el Backend.
