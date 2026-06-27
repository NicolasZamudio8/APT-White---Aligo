# Fase 2 — Desarrollo Core Backend y Agente (Horas 12 - 36)

## Información de la Fase
- Duración: 24 horas
- Enfoque: Lógica de C2, WebSockets y Persistencia

## Objetivo
El Agente debe ser capaz de conectarse al servidor (FastAPI), registrarse en la base de datos (Neon), extraer tareas encoladas, ejecutar comandos shell en el host objetivo y devolver el output de manera segura.

## Tasks (Mínimo 15)

### Comunicación Bidireccional (Sebastián & Kevin)
- [ ] **TASK-02-01**: Implementar websockets en el Backend para aceptar conexiones wss://.
- [ ] **TASK-02-02**: Diseñar el formato JSON del payload de comunicación (ID, Command, Output).
- [ ] **TASK-02-03**: En el Agente, recibir el comando JSON y parsearlo.
- [ ] **TASK-02-04**: En el Agente, usar subprocess.run para ejecutar el comando local.
- [ ] **TASK-02-05**: Capturar STDOUT y STDERR en el Agente y enviarlos de vuelta.

### Backend y Base de Datos (Juan José & Nicolás)
- [ ] **TASK-02-06**: Endpoint WSS: Insertar nuevo agente en tabla gents al conectar.
- [ ] **TASK-02-07**: Endpoint WSS: Actualizar last_seen en cada heartbeat.
- [ ] **TASK-02-08**: Crear Endpoint REST POST /api/tasks para que el UI encole trabajos.
- [ ] **TASK-02-09**: Crear hilo asíncrono o bucle en FastAPI que empuje tareas en estado QUEUED al Agente conectado correspondiente.
- [ ] **TASK-02-10**: Endpoint WSS: Recibir respuesta del Agente e insertar en tabla esults.
- [ ] **TASK-02-11**: Actualizar estado de la tarea en DB a COMPLETED o FAILED.
- [ ] **TASK-02-12**: Crear Endpoint REST GET /api/agents para el UI.
- [ ] **TASK-02-13**: Crear Endpoint REST GET /api/results/{agent_id} para el UI.

### Frontend Básico (Liliana)
- [ ] **TASK-02-14**: Crear tabla en React para listar Agentes activos (consumiendo /api/agents).
- [ ] **TASK-02-15**: Crear vista de detalle del Agente para ver historial de comandos.

## Criterios de Verificación
- [ ] El agente recibe un comando whoami (Win) o id (Lin) y el servidor C2 registra la salida correcta en la base de datos Neon.
- [ ] El dashboard muestra los agentes en línea (verificando last_seen).
