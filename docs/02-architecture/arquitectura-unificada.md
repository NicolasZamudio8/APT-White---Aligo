# Aligo C2 — Arquitectura Unificada del Sistema

Documento de referencia con diagramas Mermaid que describen la plataforma completa: operador (frontend), servidor C2 (backend), persistencia, agentes de campo e integraciones externas.

---

## 1. Vista general — Sistema unificado

```mermaid
flowchart TB
    subgraph OPERADOR["🖥️ Red del Operador"]
        direction TB
        BROWSER["Navegador Web"]
        FE["Frontend React + TypeScript<br/>Vite · puerto 1700<br/>React Router · Zustand · D3.js"]
        BROWSER --> FE
    end

    subgraph C2_CORE["⚙️ Núcleo C2 — Backend"]
        direction TB
        API["FastAPI Server<br/>puerto 8000 · Uvicorn"]
        WS_HUB["WebSocket Hub<br/>/ws/{agent_id}<br/>active_connections en memoria"]
        ENC["EncryptionManager<br/>XOR-256 / PSK"]
        PB_GEN["PlaybookGenerator<br/>ResultDecoder"]
        AI_CHAT["AI Chat Handler<br/>Sesiones Gemini en memoria"]
        SEED["seed.py<br/>33 agentes Colombia + configs"]

        API --> WS_HUB
        API --> ENC
        API --> PB_GEN
        API --> AI_CHAT
        API --> SEED
    end

    subgraph PERSISTENCIA["🗄️ Capa de Datos"]
        direction TB
        ORM["SQLAlchemy 2.0<br/>database.py · SessionLocal"]
        NEON[("Neon PostgreSQL<br/>DATABASE_URL")]
        SQLITE[("SQLite fallback<br/>aligo_c2_fallback.db")]

        ORM -->|"DATABASE_URL definida"| NEON
        ORM -->|"sin DATABASE_URL"| SQLITE
    end

    subgraph EXTERNO["☁️ Servicios Externos"]
        GEMINI["Google Gemini API<br/>gemini-3.5-flash<br/>GEMINI_API_KEY"]
    end

    subgraph CAMPO["🎯 Red Objetivo / Simulación"]
        direction TB
        MOCK["mock_agent.py<br/>Cliente Python · websockets"]
        ADV["advanced_agent.py<br/>Agente avanzado"]
        AGENT_N["Agentes Win/Linux N<br/>Beacon · ejecución local"]
        MOCK --> AGENT_N
        ADV --> AGENT_N
    end

    subgraph RED_DIST["🔗 Topología Distributiva (modelada)"]
        REDIR_DB[("redirectors<br/>uplink_id encadenado")]
        R1["Proxy Bogotá"]
        R2["Proxy Medellín"]
        R_MAIN["Main C2 Server"]
        R1 --> R_MAIN
        R2 --> R_MAIN
    end

    %% Operador ↔ Backend
    FE <-->|"REST HTTP<br/>fetch → localhost:8000/api/*"| API

    %% Backend ↔ DB
    API <-->|"Depends(get_db)<br/>CRUD + auditoría"| ORM
    SEED --> ORM

    %% Backend ↔ Gemini
    AI_CHAT <-->|"Prompt / respuesta<br/>asyncio.to_thread"| GEMINI
    PB_GEN <-->|"Generación NL → playbook"| GEMINI

    %% Agentes ↔ Backend
    AGENT_N <-->|"WSS JSON<br/>comandos cifrados · resultados"| WS_HUB
    WS_HUB --> ENC
    WS_HUB -->|"actualiza status, executions"| ORM

    %% Redirectores (referencia lógica)
    API -.->|"agents.redirector_id"| REDIR_DB
    REDIR_DB -.-> R1
    REDIR_DB -.-> R2

    style OPERADOR fill:#0f172a,stroke:#38bdf8,color:#e2e8f0
    style C2_CORE fill:#1e1b4b,stroke:#818cf8,color:#e2e8f0
    style PERSISTENCIA fill:#14532d,stroke:#4ade80,color:#e2e8f0
    style EXTERNO fill:#431407,stroke:#fb923c,color:#e2e8f0
    style CAMPO fill:#450a0a,stroke:#f87171,color:#e2e8f0
    style RED_DIST fill:#312e81,stroke:#a78bfa,color:#e2e8f0
```

---

## 2. Frontend — Páginas, componentes y APIs

```mermaid
flowchart LR
    subgraph FE_PAGES["Páginas React Router"]
        DASH["/ Dashboard"]
        AGENTS["/agents"]
        DETAIL["/agents/:id"]
        PB_PAGE["/playbooks"]
        MAP["/map"]
        SETTINGS["/settings"]
    end

    subgraph FE_COMPONENTS["Componentes clave"]
        TMAP["TacticalMap · D3"]
        TSHARK["TSharkModal"]
        AICHAT["AiChat"]
        TERM["Terminal"]
        CRYPTO["CryptoKeyManager"]
        REDIR["RedirectorManager"]
        VULN["VulnerabilityAlertModal"]
    end

    subgraph FE_STATE["Estado cliente"]
        MAP_STORE["mapStore · Zustand"]
        PB_STORE["playbookStore · Zustand"]
        SET_STORE["settingsStore · Zustand"]
    end

    subgraph FE_API["Capa API (frontend/src/api)"]
        API_MAP["map.ts"]
        API_PB["playbooks.ts"]
        API_SET["settings.ts"]
    end

    subgraph BE_REST["Backend REST /api"]
        E_AGENTS["GET /agents<br/>GET /agents/locations<br/>PATCH /agents/{id}"]
        E_CMD["POST /command<br/>GET /results"]
        E_PB["/playbooks CRUD<br/>/execute · /executions · /yaml"]
        E_CRYPTO["/crypto/keys CRUD<br/>/activate"]
        E_REDIR["/redirectors CRUD<br/>/agents/{id}/redirector-chain"]
        E_CFG["/config · /system/*<br/>/map/settings"]
        E_TSHARK["/tshark/packets"]
        E_AI["POST /ai/chat<br/>DELETE /ai/chat/{session}"]
    end

    MAP --> TMAP
    MAP --> TSHARK
    MAP --> AICHAT
    DETAIL --> TERM
    DETAIL --> CRYPTO
    MAP --> REDIR
    SETTINGS --> SET_STORE

    TMAP --> API_MAP
    MAP --> API_MAP
    PB_PAGE --> API_PB
    PB_PAGE --> PB_STORE
    SETTINGS --> API_SET

    API_MAP --> E_AGENTS
    API_MAP --> E_CMD
    API_MAP --> E_CFG
    API_PB --> E_PB
    API_SET --> E_CFG
    API_SET --> E_AI
    TERM --> E_CMD
    CRYPTO --> E_CRYPTO
    REDIR --> E_REDIR
    TSHARK --> E_TSHARK
    AICHAT --> E_AI
    DASH --> E_AGENTS
    DASH --> E_CMD
    AGENTS --> E_AGENTS
    DETAIL --> E_AGENTS
```

---

## 3. Modelo de datos relacional (Neon / SQLite)

```mermaid
erDiagram
    SYSTEM_CONFIGS {
        varchar key PK
        varchar value
        varchar description
        timestamp updated_at
    }

    CRYPTO_KEYS {
        varchar id PK
        varchar name
        varchar value
        varchar algorithm
        timestamp created_at
        timestamp rotated_at
        boolean active
    }

    REDIRECTORS {
        varchar id PK
        varchar name
        varchar host
        int port
        varchar status
        varchar uplink_id FK
        int latency_ms
        int agents_count
        float throughput_mbps
    }

    AGENTS {
        varchar id PK
        varchar os
        varchar ip
        varchar city
        double lat
        double lng
        varchar status
        varchar crypto_key_id FK
        varchar redirector_id FK
        timestamp last_seen
    }

    PLAYBOOKS {
        varchar id PK
        varchar name
        varchar description
        timestamp created_at
    }

    PLAYBOOK_STEPS {
        int id PK
        varchar playbook_id FK
        varchar command
        int delay
        int step_order
        json mitre_tactics
    }

    PLAYBOOK_EXECUTIONS {
        varchar id PK
        varchar playbook_id FK
        varchar playbook_name
        varchar status
        int current_step
        int total_steps
        timestamp started_at
        timestamp completed_at
        json agent_ids
        json logs
    }

    EXECUTIONS {
        int id PK
        varchar agent_id FK
        varchar command
        varchar result
        varchar status
        timestamp timestamp
    }

    SYSTEM_LOGS {
        int id PK
        timestamp timestamp
        varchar level
        varchar message
        varchar agent_id FK
        varchar playbook_execution_id FK
    }

    NETWORK_PACKETS {
        int id PK
        timestamp timestamp
        varchar line
        varchar interface
    }

    REDIRECTORS ||--o{ REDIRECTORS : "uplink_id"
    CRYPTO_KEYS ||--o{ AGENTS : "crypto_key_id"
    REDIRECTORS ||--o{ AGENTS : "redirector_id"
    PLAYBOOKS ||--o{ PLAYBOOK_STEPS : "contiene"
    PLAYBOOKS ||--o{ PLAYBOOK_EXECUTIONS : "ejecuta"
    AGENTS ||--o{ EXECUTIONS : "recibe comandos"
    AGENTS ||--o{ SYSTEM_LOGS : "audita"
    PLAYBOOK_EXECUTIONS ||--o{ SYSTEM_LOGS : "audita"
```

---

## 4. Flujo de despacho de comando (E2E)

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operador
    participant UI as Frontend (Map / Terminal)
    participant API as FastAPI REST
    participant DB as PostgreSQL / SQLite
    participant WS as WebSocket Hub
    participant ENC as EncryptionManager
    participant Ag as Agente (mock_agent.py)

    Op->>UI: Drag payload RECON/DUMP/BEACON/EXFIL
    UI->>API: POST /api/command { agent_id, command }
    API->>DB: SELECT agent, crypto_keys, system_configs
    alt Agente online (en active_connections)
        API->>ENC: encrypt_command(payload, PSK)
        API->>WS: send_text(JSON cifrado)
        WS->>Ag: WSS comando
        API->>DB: INSERT executions (status=sent)
        API->>DB: INSERT network_packets (TShark simulado)
        API->>DB: INSERT system_logs
        Ag->>Ag: Ejecuta comando local (whitelist)
        Ag->>WS: WSS { result, status, command }
        WS->>ENC: decrypt_payload (si cifrado)
        WS->>DB: UPDATE executions.result, agent.last_seen
        WS->>DB: INSERT system_logs
    else Agente offline
        API->>DB: INSERT executions (status=offline)
    end
    API-->>UI: { status: sent | offline }
    UI->>API: GET /api/agents/locations (polling)
    API->>DB: SELECT agents + última execution
    API-->>UI: Agentes con last_command_category
    Op->>UI: Abre TSharkModal
    UI->>API: GET /api/tshark/packets
    API->>DB: SELECT network_packets
    API-->>UI: Líneas de captura simuladas
```

---

## 5. Flujo de Playbook multihost

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operador
    participant UI as Playbooks.tsx
    participant API as FastAPI
    participant DB as Base de datos
    participant BG as run_playbook_background
    participant WS as WebSocket Hub
    participant Ag as Agentes online

    Op->>UI: Ejecutar playbook en N agentes
    UI->>API: POST /api/playbooks/{id}/execute
    API->>DB: INSERT playbook_executions (pending)
    API->>BG: asyncio.create_task(...)
    API-->>UI: { executionId }

    loop Por cada step del playbook
        BG->>DB: UPDATE current_step, logs
        loop Por cada agent_id
            alt Agente en active_connections
                BG->>WS: send_text(comando cifrado)
                WS->>Ag: WSS
                BG->>DB: APPEND logs
            else Offline
                BG->>DB: APPEND log "Skipping"
            end
        end
        BG->>BG: asyncio.sleep(delay)
    end
    BG->>DB: status=completed, completed_at
    BG->>DB: INSERT system_logs

    UI->>API: GET /api/playbooks/executions (polling)
    API->>DB: SELECT playbook_executions
    API-->>UI: Progreso y logs en vivo
```

---

## 6. Asistente IA (Copilot SecOps)

```mermaid
flowchart LR
    subgraph UI_AI["Frontend"]
        CHAT["AiChat.tsx<br/>sessionStorage session_id"]
    end

    subgraph BE_AI["Backend"]
        GUARD["Guardrails<br/>prompt injection"]
        SESS["chat_sessions<br/>dict en memoria"]
        MOCK["Fallback mock<br/>si AI deshabilitada"]
    end

    subgraph EXT["Externo"]
        GEM["Gemini gemini-3.5-flash"]
    end

    subgraph DB_AI["Persistencia"]
        CFG[("system_configs.enable_ai")]
        LOGS[("system_logs")]
    end

    CHAT -->|"POST /api/ai/chat"| GUARD
    GUARD -->|"bloqueado"| LOGS
    GUARD --> SESS
    SESS -->|"enable_ai + API key"| GEM
    SESS -->|"sin Gemini"| MOCK
    GUARD --> CFG
    GEM --> CHAT
    MOCK --> CHAT
```

---

## 7. Despliegue (contenedores)

```mermaid
flowchart TB
    subgraph DEV["Desarrollo local"]
        VITE["pnpm dev :1700"]
        UVICORN["python main.py :8000"]
        ENV[".env<br/>DATABASE_URL · GEMINI_API_KEY"]
    end

    subgraph DOCKER["Producción containerizada"]
        FE_IMG["frontend/Dockerfile<br/>Node build → nginx :80"]
        BE_IMG["backend/Dockerfile<br/>python:3.11-slim :8000"]
    end

    subgraph CLOUD["Target cloud (diseño)"]
        RAILWAY["Railway / Render"]
        NEON_CLOUD[("Neon PostgreSQL<br/>sa-east-1")]
        GCP["GCP Cloud Run redirectors<br/>Cloud Armor WAF"]
    end

    ENV --> UVICORN
    UVICORN --> NEON_CLOUD
    FE_IMG --> RAILWAY
    BE_IMG --> RAILWAY
    BE_IMG --> NEON_CLOUD
    GCP -.->|"tráfico agentes WSS"| BE_IMG
```

---

## Referencia rápida de puertos y variables

| Componente | Puerto / URL | Variables clave |
|------------|--------------|-----------------|
| Frontend Vite | `1700` | `VITE_API_URL` (opcional) |
| Backend FastAPI | `8000` | `DATABASE_URL`, `GEMINI_API_KEY`, `DEFAULT_PSK` |
| WebSocket agentes | `ws://localhost:8000/ws/{agent_id}` | `AGENT_PSK` en agente |
| Neon PostgreSQL | connection string en `.env` | `DATABASE_URL` |
| Fallback SQLite | `backend/aligo_c2_fallback.db` | auto si no hay `DATABASE_URL` |

---

## Módulos backend auxiliares

| Archivo | Responsabilidad |
|---------|-----------------|
| `database.py` | Engine SQLAlchemy, pool_pre_ping, get_db |
| `models.py` | 10 tablas ORM declarativas |
| `seed.py` | Configs, claves, redirectores, 33 agentes, playbooks demo |
| `encryption_manager.py` | Cifrado XOR de payloads WSS |
| `playbook_generator.py` | Generación/decodificación vía Gemini |
| `redirector_simulator.py` | Modelo lógico de redirectores (legacy/simulación) |
| `c2_client.py` | Cliente C2 de referencia |
