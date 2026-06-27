# Fase 3 — Innovación AI y Redirectores (Horas 36 - 52)

## Información de la Fase
- Duración: 16 horas
- Enfoque: Gemini API e Infraestructura Distribuida (Nivel 4)

## Objetivo
Elevar el proyecto al Nivel 4 (Nivel Aligo) implementando la IA como operador C2. El sistema traducirá intenciones en lenguaje natural a comandos reales. Desplegar los redirectores en GCP para ocultamiento.

## Tasks (Mínimo 15)

### IA Generativa (Nicolás & Liliana)
- [ ] **TASK-03-01**: Integrar SDK google-generativeai en FastAPI.
- [ ] **TASK-03-02**: Diseñar el prompt maestro (System Prompt) para actuar como C2 Operator.
- [ ] **TASK-03-03**: Crear Endpoint POST /api/chat que reciba intención en lenguaje natural (ej. "lista procesos de red").
- [ ] **TASK-03-04**: Configurar Gemini para que devuelva JSON estructurado (Comando Windows, Comando Linux).
- [ ] **TASK-03-05**: Backend: Según el OS del agente destino, extraer el comando e insertarlo en la tabla 	asks.
- [ ] **TASK-03-06**: Frontend: Crear componente de chat tipo ChatGPT para la UI del Operador.
- [ ] **TASK-03-07**: Backend: Implementar función de "Resumen Inteligente" con Gemini para outputs mayores a 1000 caracteres.
- [ ] **TASK-03-08**: Frontend: Mostrar botón de "Resumir" en los resultados crudos largos.

### Arquitectura Ofuscada GCP (Sebastián & Juan José)
- [ ] **TASK-03-09**: Empaquetar Backend FastAPI en Docker y subir a Artifact Registry.
- [ ] **TASK-03-10**: Desplegar Backend principal en Cloud Run (Internal Only o Auth).
- [ ] **TASK-03-11**: Configurar Cloud Load Balancer (HTTPS) con dominio custom o IP estática.
- [ ] **TASK-03-12**: Mapear WSS en el Load Balancer hacia Cloud Run Backend.
- [ ] **TASK-03-13**: Desplegar Frontend React (Build estático) en Cloud Storage o Cloud Run separado.
- [ ] **TASK-03-14**: Configurar CORS en FastAPI para aceptar peticiones del Frontend.
- [ ] **TASK-03-15**: Generar Certificados de Servidor (SSL/TLS) a través de GCP Managed Certs para el Load Balancer.

## Criterios de Verificación
- [ ] El usuario puede escribir "dime qué IP tiene" en la UI y Gemini lo traduce a ipconfig o ifconfig, encolándolo al agente.
- [ ] El tráfico del agente apunta a la IP del Load Balancer, no a la IP del Cloud Run (Redirector funcional).
- [ ] El panel web React es accesible públicamente vía HTTPS.
