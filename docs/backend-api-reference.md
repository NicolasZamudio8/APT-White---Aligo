# Backend API Reference - Aligo C2

Documento de referencia completa de todas las funciones, endpoints y módulos del backend FastAPI de Aligo C2.

---

## 📋 Índice

1. [Configuración y Middleware](#configuración-y-middleware)
2. [Endpoints REST](#endpoints-rest)
   - [Agentes](#agentes)
   - [Comandos](#comandos)
   - [Playbooks](#playbooks)
   - [Redirectores](#redirectores)
   - [Claves Criptográficas](#claves-criptográficas)
   - [Configuración del Sistema](#configuración-del-sistema)
   - [TShark](#tshark)
   - [IA Chat](#ia-chat)
3. [Endpoints WebSocket](#endpoints-websocket)
4. [Funciones Auxiliares](#funciones-auxiliares)
5. [Modelos Pydantic](#modelos-pydantic)
6. [Módulos Importados](#módulos-importados)

---

## Configuración y Middleware

### Middleware CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Permite acceso desde cualquier origen (configurado para desarrollo).

### Evento de Startup
```python
@app.on_event("startup")
def startup_event():
```
- Inicializa el esquema de base de datos SQLAlchemy
- Ejecuta `seed_database()` si no hay agentes en la DB
- Configura tablas: agents, playbooks, crypto_keys, redirectors, etc.

### Variables de Entorno
- `DATABASE_URL`: Connection string de Neon PostgreSQL
- `GEMINI_API_KEY`: API Key de Google Gemini para IA

### Configuración Gemini
- Modelo: `gemini-3.5-flash`
- Sesiones de chat almacenadas en memoria (`chat_sessions: Dict[str, object]`)
- System prompt: `ALIGO_C2_SYSTEM_PROMPT` (Asistente SecOps especializado)

---

## Endpoints REST

### Agentes

#### GET `/api/agents`
**Descripción:** Obtiene lista completa de agentes con última ejecución y categoría de comando.

**Respuesta:**
```json
[
  {
    "id": "ag-bog-1001",
    "os": "Windows 11",
    "ip": "192.168.1.45",
    "status": "online",
    "city": "Bogota",
    "lat": 4.7110,
    "lng": -74.0721,
    "crypto_key_id": "key-default",
    "redirector_id": "redir-bog",
    "last_seen": "2024-06-27T05:00:00",
    "encryption_enabled": true,
    "last_command_category": "recon"
  }
]
```

**Optimización:** Usa JOIN con subquery para evitar N+1 queries.

---

#### GET `/api/agents/locations`
**Descripción:** Obtiene ubicaciones geográficas de agentes para el mapa táctico.

**Respuesta:**
```json
[
  {
    "agentId": "ag-bog-1001",
    "os": "Windows 11",
    "ip": "192.168.1.45",
    "city": "Bogota",
    "lat": 4.7110,
    "lng": -74.0721,
    "status": "online",
    "last_command_category": "recon"
  }
]
```

---

#### PATCH `/api/agents/{agent_id}`
**Descripción:** Actualiza configuración de un agente (clave de cifrado, redirector).

**Body:**
```json
{
  "crypto_key_id": "key-new",
  "redirector_id": "redir-med"
}
```

**Respuesta:**
```json
{"status": "success"}
```

**Auditoría:** Registra cambio en `system_logs`.

---

### Comandos

#### POST `/api/command`
**Descripción:** Despacha un comando a un agente específico vía WebSocket.

**Body:**
```json
{
  "agent_id": "ag-bog-1001",
  "command": "whoami"
}
```

**Flujo:**
1. Verifica que el agente exista
2. Lee configuración de cifrado y PSK activo
3. Si el agente está en `active_connections`:
   - Cifra el payload con `EncryptionManager.encrypt_command()`
   - Envía vía WebSocket
   - Estado: `sent`
4. Si el agente está offline:
   - Estado: `offline`
5. Registra ejecución en `executions`
6. Genera paquetes TShark simulados
7. Registra evento en `system_logs`

**Respuesta:**
```json
{"status": "sent", "agent": "ag-bog-1001"}
```

---

#### GET `/api/results`
**Descripción:** Obtiene las últimas 100 ejecuciones de comandos.

**Respuesta:**
```json
[
  {
    "agent_id": "ag-bog-1001",
    "command": "whoami",
    "result": "DESKTOP-ABC\\user",
    "status": "completed",
    "timestamp": "2024-06-27T05:00:00"
  }
]
```

---

#### POST `/api/results/decode`
**Descripción:** Decodifica resultados de comandos usando IA (Gemini) para análisis táctico.

**Body:**
```json
{
  "command": "reg query HKLM\\SYSTEM",
  "result": "[output crudo]"
}
```

**Respuesta:**
```json
{
  "summary": "Análisis del registro...",
  "risks": ["Configuración insegura detectada"],
  "recommendations": [...]
}
```

---

### Playbooks

#### GET `/api/playbooks`
**Descripción:** Obtiene todos los playbooks con sus pasos.

**Respuesta:**
```json
[
  {
    "id": "pb-abc123",
    "name": "Persistence Scan",
    "description": "Escaneo de persistencia básico",
    "steps": [
      {
        "command": "schtasks /query",
        "delay": 2,
        "mitre_tactics": ["T1053"]
      }
    ]
  }
]
```

---

#### POST `/api/playbooks`
**Descripción:** Crea un nuevo playbook manualmente.

**Body:**
```json
{
  "name": "Custom Scan",
  "description": "Playbook personalizado",
  "steps": [
    {
      "command": "whoami",
      "delay": 1,
      "mitre_tactics": ["T1082"]
    }
  ]
}
```

**Respuesta:**
```json
{
  "id": "pb-xyz789",
  "name": "Custom Scan",
  "description": "Playbook personalizado",
  "steps": [...]
}
```

---

#### POST `/api/playbooks/generate`
**Descripción:** Genera un playbook usando IA (Gemini) desde descripción en lenguaje natural.

**Body:**
```json
{
  "request": "Crea un playbook para enumeración de sistema y persistencia"
}
```

**Respuesta:**
```json
{
  "status": "success",
  "playbook": {
    "id": "pb-ai123",
    "name": "AI Generated Playbook",
    "description": "...",
    "steps": [...]
  }
}
```

---

#### PUT `/api/playbooks/{playbook_id}`
**Descripción:** Actualiza un playbook existente (reemplaza todos los pasos).

**Body:** Mismo que POST `/api/playbooks`

---

#### DELETE `/api/playbooks/{playbook_id}`
**Descripción:** Elimina un playbook.

**Respuesta:**
```json
{"status": "success", "message": "Deleted playbook pb-abc123"}
```

---

#### GET `/api/playbooks/{playbook_id}/yaml`
**Descripción:** Exporta un playbook a formato YAML.

**Respuesta:** (Content-Type: `application/x-yaml`)
```yaml
name: Persistence Scan
description: Escaneo de persistencia básico
steps:
  - command: schtasks /query
    delay: 2
    mitre_tactics:
      - T1053
```

---

#### POST `/api/playbooks/yaml`
**Descripción:** Importa un playbook desde YAML.

**Body:**
```json
{
  "yaml_content": "name: ...\nsteps: ..."
}
```

---

#### POST `/api/playbooks/{playbook_id}/execute`
**Descripción:** Ejecuta un playbook en múltiples agentes (background task).

**Body:**
```json
{
  "agent_ids": ["ag-bog-1001", "ag-med-2002"]
}
```

**Flujo:**
1. Crea registro en `playbook_executions` (status: `pending`)
2. Lanza `asyncio.create_task(run_playbook_background(...))`
3. Ejecuta pasos secuencialmente con delays
4. Para cada agente online: envía comando cifrado vía WebSocket
5. Actualiza progreso en tiempo real en `logs`

**Respuesta:**
```json
{"status": "enqueued", "executionId": "exec-abc123"}
```

---

#### GET `/api/playbooks/executions`
**Descripción:** Obtiene historial de ejecuciones de playbooks.

**Respuesta:**
```json
[
  {
    "id": "exec-abc123",
    "playbookId": "pb-xyz789",
    "playbookName": "Persistence Scan",
    "agentIds": ["ag-bog-1001"],
    "status": "completed",
    "currentStep": 3,
    "totalSteps": 3,
    "startedAt": "2024-06-27T05:00:00",
    "completedAt": "2024-06-27T05:00:10",
    "logs": [...]
  }
]
```

---

### Redirectores

#### GET `/api/redirectors`
**Descripción:** Obtiene todos los redirectores de red.

**Respuesta:**
```json
[
  {
    "id": "redir-bog",
    "name": "Proxy Bogota",
    "host": "proxy.bog.example.com",
    "port": 443,
    "uplinkId": null,
    "status": "online",
    "createdAt": "2024-06-27T05:00:00",
    "latencyMs": 42,
    "agentsCount": 12,
    "throughputMbps": 15.5
  }
]
```

---

#### POST `/api/redirectors`
**Descripción:** Crea un nuevo redirector.

**Body:**
```json
{
  "name": "Proxy Medellin",
  "host": "proxy.med.example.com",
  "port": 443,
  "uplink_id": ""
}
```

---

#### GET `/api/redirectors/{redir_id}`
**Descripción:** Obtiene detalles de un redirector específico.

---

#### PUT `/api/redirectors/{redir_id}/status`
**Descripción:** Actualiza el estado de un redirector.

**Body:**
```json
{"status": "degraded"}
```

---

#### GET `/api/agents/{agent_id}/redirector-chain`
**Descripción:** Obtiene la cadena de redirectores de un agente (recursivo via `uplink_id`).

**Respuesta:**
```json
[
  {
    "id": "redir-med",
    "name": "Proxy Medellin",
    "uplinkId": "redir-bog"
  },
  {
    "id": "redir-bog",
    "name": "Proxy Bogota",
    "uplinkId": null
  }
]
```

---

#### DELETE `/api/redirectors/{redir_id}`
**Descripción:** Elimina un redirector.

---

### Claves Criptográficas

#### GET `/api/crypto/keys`
**Descripción:** Obtiene todas las claves de cifrado.

**Respuesta:**
```json
[
  {
    "id": "key-default",
    "name": "Default PSK",
    "value": "abc123...",
    "algorithm": "XOR-256",
    "createdAt": "2024-06-27T05:00:00",
    "rotatedAt": "2024-06-27T05:00:00",
    "active": true
  }
]
```

---

#### POST `/api/crypto/keys`
**Descripción:** Crea una nueva clave criptográfica (genera valor aleatorio con `secrets.token_hex(16)`).

**Body:**
```json
{
  "name": "New PSK",
  "algorithm": "XOR-256"
}
```

---

#### PUT `/api/crypto/keys/{key_id}/activate`
**Descripción:** Activa una clave (desactiva todas las demás).

**Respuesta:**
```json
{"status": "activated"}
```

**Nota:** Los agentes deben actualizar su PSK después de la rotación.

---

#### DELETE `/api/crypto/keys/{key_id}`
**Descripción:** Elimina una clave (no permite eliminar la activa).

---

### Configuración del Sistema

#### GET `/api/config`
**Descripción:** Obtiene configuración global del sistema.

**Respuesta:**
```json
{
  "security_level": "High",
  "beacon_interval": 10,
  "log_level": "INFO",
  "enable_ai": true,
  "enable_encryption": true
}
```

---

#### PUT `/api/config`
**Descripción:** Actualiza configuración global.

**Body:**
```json
{
  "security_level": "Medium",
  "beacon_interval": 30,
  "log_level": "DEBUG",
  "enable_ai": false,
  "enable_encryption": true
}
```

---

#### GET `/api/system/status`
**Descripción:** Obtiene estado del sistema (uptime, métricas simuladas).

**Respuesta:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "cpu": 25,
  "ram": 150,
  "activeAgents": 28,
  "totalPlaybooks": 5,
  "dbConnection": "Connected (Neon DB Engine Active)",
  "redirectorsActive": 3,
  "encryptionStatus": "ENABLED"
}
```

---

#### POST `/api/system/diagnose`
**Descripción:** Ejecuta diagnóstico del sistema y registra pasos en logs.

**Respuesta:**
```json
{"status": "completed", "diagnosticId": "diag-abc123"}
```

---

#### GET `/api/system/logs`
**Descripción:** Obtiene los últimos 150 logs del sistema.

**Respuesta:**
```json
[
  {
    "timestamp": "2024-06-27T05:00:00",
    "level": "INFO",
    "message": "Agent ag-bog-1001 connected"
  }
]
```

---

#### GET `/api/map/settings`
**Descripción:** Obtiene configuración del mapa (modo drone, departamento seleccionado).

**Respuesta:**
```json
{
  "drone_mode": true,
  "selected_department": "TODOS"
}
```

---

#### PUT `/api/map/settings`
**Descripción:** Actualiza configuración del mapa.

**Body:**
```json
{
  "drone_mode": false,
  "selected_department": "Cundinamarca"
}
```

---

### TShark

#### GET `/api/tshark/packets`
**Descripción:** Obtiene paquetes de red simulados generados por comandos.

**Respuesta:**
```json
[
  {
    "id": 1,
    "line": "05:00:00.000000  192.168.1.45 → 10.0.0.1 TCP [SYN]",
    "timestamp": "2024-06-27T05:00:00",
    "interface": "any"
  }
]
```

---

#### DELETE `/api/tshark/packets`
**Descripción:** Limpia todos los paquetes de red simulados.

**Respuesta:**
```json
{"status": "cleared"}
```

---

### IA Chat

#### POST `/api/ai/chat`
**Descripción:** Chat con asistente IA (Gemini) para análisis de ciberseguridad.

**Body:**
```json
{
  "message": "Analiza el ataque RECON ejecutado",
  "session_id": "default",
  "context_type": null,
  "context_data": null,
  "attack_context": {
    "commandLabel": "RECON",
    "commandId": "recon",
    "agentId": "ag-bog-1001",
    "ip": "192.168.1.45",
    "city": "Bogota",
    "timestamp": "2024-06-27T05:00:00"
  }
}
```

**Guardrails:**
- Detecta prompt injection (`rm -rf`, `drop table`, `ignore previous instructions`)
- Bloquea comandos destructivos

**Contextos especiales:**
- `log_analysis`: Analiza logs crudos de agentes
- `attack_context`: Incluye contexto del ataque ejecutado

**Respuesta:**
```json
{
  "reply": "Análisis del ataque RECON...",
  "session_id": "default"
}
```

**Fallback:** Si Gemini no está configurado o falla, usa respuestas mock.

---

#### DELETE `/api/ai/chat/{session_id}`
**Descripción:** Reinicia una sesión de chat (limpia historial).

**Respuesta:**
```json
{"status": "reset", "session_id": "default"}
```

---

## Endpoints WebSocket

### WS `/ws/{agent_id}`
**Descripción:** Canal de comunicación bidireccional con agentes.

**Flujo de conexión:**
1. Agente se conecta con `agent_id`
2. Si no existe en DB, crea entrada fallback (Bogotá)
3. Actualiza estado a `online` y `last_seen`
4. Lee PSK activo y configuración de cifrado
5. Registra conexión en `system_logs`

**Loop de recepción:**
1. Recibe payload JSON del agente
2. Si está cifrado (`_encrypted`), descifra con `EncryptionManager.decrypt_payload()`
3. Si contiene `result`:
   - Actualiza `executions` con resultado
   - Actualiza `agent.last_seen` y `status`
   - Registra en `system_logs`

**Desconexión:**
- Elimina de `active_connections`
- Actualiza estado a `offline`
- Registra desconexión en `system_logs`

**Payload de comando (enviado desde servidor):**
```json
{
  "type": "command",
  "data": "whoami",
  "_encrypted": "base64_encoded_xor"
}
```

**Payload de resultado (recibido desde agente):**
```json
{
  "result": "DESKTOP-ABC\\user",
  "command": "whoami",
  "status": "completed"
}
```

---

## Funciones Auxiliares

### `generate_tshark_packets(db, agent_ip, command)`
**Descripción:** Genera paquetes de red simulados basados en el comando ejecutado.

**Categorías:**
- `recon` (whoami): TCP SYN a puertos WMI/RPC, ICMP ping, ARP sweep
- `dump` (sam): SMB NTLMSSP negotiation, MSRPC LSARPC
- `beacon` (schtasks): DNS lookup, HTTPS TLS con domain fronting
- `exfil` (copy): DNS tunneling, HTTPS upload chunks

**Salida:** Registra líneas en `network_packets` con formato TShark.

---

### `run_playbook_background(execution_id, playbook_id, agent_ids)`
**Descripción:** Ejecuta playbook en background (async task).

**Flujo:**
1. Obtiene pasos del playbook
2. Actualiza estado a `running`
3. Para cada step:
   - Actualiza `current_step` y logs
   - Para cada agente online:
     - Envía comando cifrado vía WebSocket
     - Registra dispatch en logs
   - Para agentes offline: registra "Skipping"
   - `asyncio.sleep(delay)` entre steps
4. Al completar: estado `completed`, `completed_at`

---

## Modelos Pydantic

### `PlaybookStepIn`
```python
command: str
delay: int = 2
mitre_tactics: List[str]
```

### `PlaybookCreateIn`
```python
name: str
description: Optional[str]
steps: List[PlaybookStepIn]
```

### `PlaybookGenerateIn`
```python
request: str  # 10-500 caracteres
```

### `PlaybookExecuteIn`
```python
agent_ids: List[str]
```

### `AiChatIn`
```python
message: str  # 1-4000 caracteres
session_id: str = "default"
context_type: Optional[str]
context_data: Optional[str]
attack_context: Optional[dict]
```

### `ConfigUpdateIn`
```python
security_level: str
beacon_interval: int  # 1-3600
log_level: str
enable_ai: bool
enable_encryption: bool = True
```

### `CryptoKeyIn`
```python
name: str
algorithm: str = "XOR-256"
```

### `RedirectorCreateIn`
```python
name: str
host: str
port: int  # 1-65535
uplink_id: Optional[str]
```

### `AgentUpdateIn`
```python
crypto_key_id: Optional[str]
redirector_id: Optional[str]
```

### `AgentCommandIn`
```python
agent_id: str
command: str
```

### `MapSettingsIn`
```python
drone_mode: bool
selected_department: str
```

### `PlaybookYamlImportIn`
```python
yaml_content: str
```

---

## Módulos Importados

### `database.py`
- `engine`: SQLAlchemy engine
- `SessionLocal`: Session factory
- `Base`: Declarative base
- `get_db`: Dependency injection para sesiones

### `models.py`
- `SystemConfigModel`
- `AgentModel`
- `PlaybookModel`
- `PlaybookStepModel`
- `PlaybookExecutionModel`
- `ExecutionModel`
- `CryptoKeyModel`
- `RedirectorModel`
- `SystemLogModel`
- `NetworkPacketModel`

### `seed.py`
- `seed_database(db)`: Inicializa DB con datos de demo

### `encryption_manager.py`
- `EncryptionManager.encrypt_command(payload, psk)`
- `EncryptionManager.decrypt_payload(payload, psk)`

### `playbook_generator.py`
- `PlaybookGenerator.generate_playbook(request)`: Genera playbook con IA
- `ResultDecoder.decode_result(command, result)`: Decodifica resultados con IA

---

## Estado Global

### `active_connections: Dict[str, WebSocket]`
Almacena conexiones WebSocket activas por `agent_id`.

### `chat_sessions: Dict[str, object]`
Almacena sesiones de chat Gemini por `session_id`.

### `server_start_time: float`
Timestamp de inicio del servidor (para cálculo de uptime).

### `gemini_model: GenerativeModel`
Instancia del modelo Gemini (o `None` si no configurado).

---

## Optimizaciones de Base de Datos

### Evitar N+1 Queries
```python
# Subquery para latest execution por agente
subq = db.query(
    ExecutionModel.agent_id,
    func.max(ExecutionModel.timestamp).label("max_ts")
).group_by(ExecutionModel.agent_id).subquery()

latest_execs = db.query(ExecutionModel).join(
    subq,
    (ExecutionModel.agent_id == subq.c.agent_id) & 
    (ExecutionModel.timestamp == subq.c.max_ts)
).all()
```

Usado en:
- `GET /api/agents`
- `GET /api/agents/locations`

---

## Seguridad

### Cifrado
- Algoritmo: XOR-256 (configurable)
- PSK: Almacenado en `crypto_keys` tabla
- Activación: Solo una clave activa a la vez
- WebSocket: Payloads cifrados antes de enviar

### Guardrails IA
- Detección de prompt injection
- Bloqueo de comandos destructivos
- System prompt especializado en ciberseguridad

### Auditoría
- Todos los cambios registrados en `system_logs`
- Incluye: conexiones de agentes, comandos, cambios de configuración

---

## Errores Comunes

### 404 Not Found
- Agente no existe
- Playbook no existe
- Redirector no existe
- Clave criptográfica no existe

### 400 Bad Request
- YAML inválido en import
- Intento de eliminar clave activa

### Agent Offline
- Comando despachado pero agente no en `active_connections`
- Estado: `offline` en respuesta

---

## Puerto y Host

- **Host:** `0.0.0.0`
- **Puerto:** `8000`
- **Comando:** `uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`

---

## Dependencias Principales

- `fastapi`: Framework web
- `uvicorn`: ASGI server
- `sqlalchemy`: ORM
- `pydantic`: Validación de datos
- `google-generativeai`: IA Gemini
- `python-dotenv`: Variables de entorno
- `pyyaml`: Import/export YAML
