# Fase 4 — Testing, UI y Entregables (Horas 52 - 72)

## Información de la Fase
- Duración: 20 horas
- Enfoque: Estabilización, Compilación, Demo y Documentación (Requisito mínimo).

## Objetivo
Dejar todo listo para el jurado. Esto incluye compilar el Agente a .exe y ELF binario, grabar el video de 3-7 minutos, pulir la interfaz, y armar la documentación técnica del repositorio en el README final.

## Tasks (Mínimo 15)

### Compilación y Testing Final (Sebastián & Kevin)
- [ ] **TASK-04-01**: Instalar pyinstaller en el entorno de desarrollo.
- [ ] **TASK-04-02**: Compilar agente en formato .exe para Windows (pyinstaller --onefile --noconsole).
- [ ] **TASK-04-03**: Compilar agente en formato ELF binario para Linux.
- [ ] **TASK-04-04**: Probar binarios en VMs limpias (Target) hacia el Load Balancer GCP.
- [ ] **TASK-04-05**: Simular caída de red y verificar reconexión automática del agente.
- [ ] **TASK-04-06**: Ejecutar casos de prueba E2E (Red Teaming local).

### Pulimiento UI (Liliana)
- [ ] **TASK-04-07**: Añadir notificaciones visuales (Toasts) al dashboard cuando se conecte un nuevo agente.
- [ ] **TASK-04-08**: Estilizar el chat de Gemini (modo terminal hacker para ganar puntos estéticos).
- [ ] **TASK-04-09**: Validar que la tabla de agentes actualiza su estado ("Online"/"Offline") dinámicamente.

### Documentación y Entregables (Nicolás & Equipo)
- [ ] **TASK-04-10**: Escribir README.md del repositorio con instrucciones de despliegue local y dependencias.
- [ ] **TASK-04-11**: Consolidar diagramas de arquitectura Mermaid y pegarlos en la documentación.
- [ ] **TASK-04-12**: Redactar sección de "Innovación (Nivel 4)" argumentando por qué el C2 es revolucionario.
- [ ] **TASK-04-13**: Grabar video pitch de 3 a 7 minutos demostrando el servidor, agente conectado y ejecución end-to-end.
- [ ] **TASK-04-14**: Edición del video (voz en off o explicaciones claras por parte de Liliana).
- [ ] **TASK-04-15**: Preparar entorno de demo en vivo limpio (purgar base de datos).

## Criterios de Verificación
- [ ] Los 4 entregables exigidos por Aligo están listos (Código, Documentación, Video, Demo en Vivo).
- [ ] El ejecutable no lanza errores de dependencias perdidas al correr en una máquina limpia.
- [ ] README explica cómo correr todo desde cero.
