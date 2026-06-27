# Arquitectura del Sistema (C2)

Esta es la arquitectura distribuida E2E diseñada para evadir detección y soportar miles de conexiones simultáneas.

## Diagrama de Arquitectura (Mermaid)

\\\mermaid
graph TD
    subgraph Target Network
        A1[Agente Win/Lin 1]
        A2[Agente Win/Lin N]
    end

    subgraph GCP - Edge/Redirectors
        WAF[Cloud Armor / Load Balancer]
        R1[Redirector Cloud Run]
    end

    subgraph GCP - C2 Core
        C2[FastAPI C2 Server]
        Auth[mTLS Validator]
        Gemini[Gemini API 3.1 Pro]
    end

    subgraph Neon - Data Layer
        DB[(PostgreSQL Serverless)]
    end

    subgraph Operator Network
        UI[React.js Dashboard]
    end

    %% Conexiones
    A1 -- WSS (mTLS) --> WAF
    A2 -- WSS (mTLS) --> WAF
    WAF -- Forward --> R1
    R1 -- WSS --> C2
    C2 <--> Auth
    C2 -- Async PG --> DB
    UI -- HTTPS (REST/WSS) --> C2
    C2 -- Prompt --> Gemini
    Gemini -- Shell/Analysis --> C2
\\\

## Componentes y Responsabilidades

1. **Agente (Payload):**
   * Tarea: Beaconing (WSS) constante o por intervalos, y ejecución local de binarios/shell (SO respectivo).
   * Persistencia y anti-tampering básico.
2. **Redirector (Edge):**
   * Tarea: Ofuscar el servidor C2 real. Recibe el tráfico y lo redirige internamente usando Cloud Run.
3. **Servidor C2 (FastAPI):**
   * Tarea: Mantener conexiones WebSocket abiertas, gestionar el estado de los agentes, encolar comandos y traducir órdenes en lenguaje natural mediante **Gemini API**.
4. **Base de Datos (Neon):**
   * Persistencia relacional de agentes, tareas (queue) e histórico de resultados.
5. **Dashboard de Operador (React):**
   * Interfaz de control táctico para visualizar información y usar el chat C2 impulsado por IA.
