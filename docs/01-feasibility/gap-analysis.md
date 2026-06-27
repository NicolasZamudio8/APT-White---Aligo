# Gap Analysis - Acta de Requerimiento Original vs Plan

Este documento detalla los vacíos encontrados en el acta de requerimiento del Reto Aligo original y cómo fueron abordados por el equipo para estructurar un plan sólido de 72 horas.

## Gaps Identificados y Resoluciones

1. **Plataforma de despliegue no especificada:**
   * **Gap:** El reto habla de 'servidor', pero no indica infraestructura requerida (AWS, GCP, Azure, Local).
   * **Resolución:** Se decide utilizar **Google Cloud Platform (GCP)** con **Cloud Run** para asegurar alta disponibilidad y rapidez en el despliegue de contenedores, que es ideal para la evaluación.

2. **Base de Datos omitida:**
   * **Gap:** El requerimiento pide manejo de múltiples agentes, pero no impone un esquema de persistencia.
   * **Resolución:** Implementaremos **Neon (PostgreSQL Serverless)**. Se adapta bien a arquitecturas asíncronas y facilita el modelado estructurado que permite la integración con el dashboard frontend.

3. **Arquitectura C2 (Sockets vs HTTP):**
   * **Gap:** El reto deja libre la elección del canal (Nivel 2 pide cifrado y Nivel 3 canales no convencionales).
   * **Resolución:** Para lograr escalabilidad (Nivel 4), se rechazan sockets TCP puros y se opta por **WebSockets (WSS)**, permitiendo evadir firewalls modernos (tráfico en puerto 443) y manteniendo persistencia bidireccional.

4. **El vector de 'Innovación Técnica' (35%):**
   * **Gap:** El Nivel 4 exige elevar el estado del arte.
   * **Resolución:** Integraremos la API de **Google Gemini** para traducir instrucciones humanas a comandos técnicos (LLM as C2 Operator), superando enfoques tradicionales o IoT.

5. **Lenguajes del Backend y Agente:**
   * **Gap:** Totalmente abierto.
   * **Resolución:** Usaremos **Python (FastAPI)** para el backend por su potente manejo de concurrencia (syncio) y para el agente porque es un lenguaje fuerte en el equipo y puede compilarse fácilmente en binarios multiplataforma con PyInstaller.
