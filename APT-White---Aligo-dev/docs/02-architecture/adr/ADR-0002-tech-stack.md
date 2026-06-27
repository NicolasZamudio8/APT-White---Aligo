# ADR 0002: Stack Tecnológico

## Estado
Aprobado

## Contexto
Debemos construir un C2 (Servidor y Agente) más una Interfaz de Operador que logre el Nivel 4 de innovación del Reto Aligo. Necesitamos herramientas rápidas, robustas y de despliegue inmediato.

## Decisión
Se ha definido el siguiente Stack Tecnológico E2E:
1. **Infraestructura Cloud:** Google Cloud Platform (GCP).
2. **Backend / Servidor C2:** Python con FastAPI (usando WebSockets para la comunicación con los agentes). Desplegado en GCP Cloud Run.
3. **Agente (Payload):** Script en Python compilado a ejecutable nativo multiplataforma (Windows/Linux) mediante PyInstaller.
4. **Base de Datos:** Neon (PostgreSQL Serverless).
5. **Frontend (Panel de Control):** React.js, consumiendo la API de FastAPI.
6. **Innovación / IA:** Google Gemini API 3.1 Pro para procesamiento en lenguaje natural de los comandos y análisis de datos exfiltrados.
7. **Seguridad / Criptografía:** mTLS estricto para WebSockets, y arquitectura de redirectores en GCP para ofuscar el Servidor C2 principal.

## Consecuencias
- **Positivas:** FastAPI + WSS + Neon permiten escalar miles de conexiones concurrentes evadiendo restricciones de firewalls tradicionales. React provee una UI profesional que suma puntos en la demo.
- **Negativas:** Configurar el mTLS estricto para WebSockets requerirá una gestión de certificados (PKI) cuidadosa en las primeras horas, lo que supone un cuello de botella inicial.
