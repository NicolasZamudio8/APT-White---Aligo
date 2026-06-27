from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import uuid
import asyncio
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from encryption_manager import EncryptionManager
from redirector_simulator import RedirectorSimulator
from playbook_generator import PlaybookGenerator, ResultDecoder

try:
    import google.generativeai as genai
except ImportError:
    genai = None

app = FastAPI(title="Aligo C2 Backend Simulator")

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
            {"command": "netstat", "delay": 2}
        ]
    },
    "pb-2": {
        "id": "pb-2",
        "name": "Verificacion de Persistencia",
        "description": "Lista las tareas programadas y los usuarios registrados en el sistema.",
        "steps": [
            {"command": "hostname", "delay": 3},
            {"command": "uname", "delay": 4}
        ]
    }
}

# Playbook execution logs
playbook_executions = []

# Encryption keys management
crypto_keys = {
    "default": {
        "id": "key-default",
        "name": "Default PSK",
        "value": os.getenv("DEFAULT_PSK", "aligo-shared-secret-2024-v1"),
        "algorithm": "XOR-256",
        "createdAt": datetime.now().isoformat(),
        "rotatedAt": datetime.now().isoformat(),
        "active": True
    }
}

# Redirector simulator
redirector_simulator = RedirectorSimulator()

# System Configuration
system_config = {
    "security_level": "High",
    "beacon_interval": 10,
    "log_level": "INFO",
    "enable_ai": True,
    "enable_encryption": True
}

# System Logs
system_logs = [
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Aligo C2 Server Simulator initialized successfully."},
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Database pool established on Neon PostgreSQL (Backup in-memory activated)."},
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "WebSocket listener bound to ws://localhost:8000/ws."},
    {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Enhanced encryption & redirector simulator initialized."}
]

# Cities in Colombia for agent geolocation mapping
COLOMBIA_CITIES = [
    {"city": "Bogota", "lat": 4.7110, "lng": -74.0721},
    {"city": "Medellin", "lat": 6.2442, "lng": -75.5812},
    {"city": "Cali", "lat": 3.4516, "lng": -76.5320},
    {"city": "Barranquilla", "lat": 10.9685, "lng": -74.7813},
    {"city": "Bucaramanga", "lat": 7.1193, "lng": -73.1227}
]

# Setup Gemini API key
gemini_key = os.getenv("GEMINI_API_KEY", "")
if gemini_key:
    try:
        genai.configure(api_key=gemini_key)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"[-] Failed to configure Gemini: {e}")
        gemini_model = None
else:
    gemini_model = None

# Initialize generators
playbook_generator = PlaybookGenerator(gemini_model)
result_decoder = ResultDecoder(gemini_model)

# Pydantic Schemas for validation in the API boundary
class PlaybookStepIn(BaseModel):
    command: str = Field(..., min_length=1)
    delay: int = Field(default=2, ge=0)

class PlaybookCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="")
    steps: List[PlaybookStepIn] = Field(..., min_length=1)

class PlaybookGenerateIn(BaseModel):
    request: str = Field(..., min_length=10, max_length=500)

class PlaybookExecuteIn(BaseModel):
    agent_ids: List[str] = Field(..., min_length=1)

class ConfigUpdateIn(BaseModel):
    security_level: str = Field(..., min_length=1)
    beacon_interval: int = Field(..., ge=1, le=3600)
    log_level: str = Field(..., min_length=3)
    enable_ai: bool
    enable_encryption: bool = True

class ChatMessageIn(BaseModel):
    message: str = Field(..., min_length=1)

class CryptoKeyIn(BaseModel):
    name: str = Field(..., min_length=1)
    algorithm: str = Field(default="XOR-256")

class RedirectorCreateIn(BaseModel):
    name: str = Field(..., min_length=1)
    host: str = Field(...)
    port: int = Field(..., ge=1, le=65535)
    uplink_id: Optional[str] = None

# Helper function to map agent ID to Colombian City deterministically
def get_agent_location(agent_id: str, index_offset: int = 0):
    hash_val = hash(agent_id) + index_offset
    city_info = COLOMBIA_CITIES[abs(hash_val) % len(COLOMBIA_CITIES)]
    return city_info

@app.get("/")
def read_root():
    return {"status": "Mock C2 Backend Running (Enhanced v2)", "engine": "FastAPI", "features": ["resilient_agent", "encryption", "ai_playbook_gen", "redirector_sim"]}

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
        "lng": city_info["lng"],
        "encryption_enabled": system_config["enable_encryption"]
    }
    
    # Log connection event
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Agent {agent_id} connected from {city_info['city']} ({agents_info[agent_id]['ip']}) [Encryption: {'ON' if system_config['enable_encryption'] else 'OFF'}]"
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            print(f"Received from {agent_id}: {payload.get('type', 'unknown')}")
            
            # Decrypt if needed
            if system_config["enable_encryption"] and "_encrypted" in payload:
                psk = crypto_keys["default"]["value"]
                decrypted = EncryptionManager.decrypt_payload(payload, psk)
                if decrypted:
                    payload = decrypted
            
            if "result" in payload:
                mock_results.append(payload)
                system_logs.append({
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": f"Received execution result from agent {agent_id}: {payload.get('command', 'unknown')}."
                })
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
    
    if agent_id in active_connections:
        payload = {"type": "command", "data": cmd_text}
        
        # Encrypt if enabled
        if system_config["enable_encryption"]:
            psk = crypto_keys["default"]["value"]
            payload = EncryptionManager.encrypt_command(payload, psk)
        
        await active_connections[agent_id].send_text(json.dumps(payload))
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "INFO",
            "message": f"Command '{cmd_text}' dispatched to agent {agent_id}. [Encrypted: {system_config['enable_encryption']}]"
        })
        return {"status": "sent", "agent": agent_id}
    return {"status": "offline", "error": "Agent not connected"}

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

@app.post("/api/playbooks/generate")
def generate_playbook_ai(request: PlaybookGenerateIn):
    """Generate playbook from natural language using Gemini."""
    generated = playbook_generator.generate_playbook(request.request)
    
    if generated:
        pb_id = f"pb-{uuid.uuid4().hex[:6]}"
        new_pb = {
            "id": pb_id,
            "name": generated.get("name", "AI Generated Playbook"),
            "description": generated.get("description", ""),
            "steps": generated.get("steps", [])
        }
        mock_playbooks[pb_id] = new_pb
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "INFO",
            "message": f"AI-generated playbook '{new_pb['name']}' created from request: {request.request[:50]}..."
        })
        return {"status": "success", "playbook": new_pb}
    
    return {"status": "error", "message": "Failed to generate playbook"}

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
        execution_record["currentStep"] = step_idx + 1
        execution_record["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "message": f"Executing Step {step_idx + 1}/{len(steps)}: Running '{step['command']}' with {step['delay']}s delay."
        })
        
        for agent_id in agent_ids:
            if agent_id in active_connections:
                try:
                    payload = {"type": "command", "data": step["command"]}
                    if system_config["enable_encryption"]:
                        psk = crypto_keys["default"]["value"]
                        payload = EncryptionManager.encrypt_command(payload, psk)
                    
                    await active_connections[agent_id].send_text(json.dumps(payload))
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
    asyncio.create_task(run_playbook_background(exec_id, playbook_id, execution_request.agent_ids))
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Enqueued playbook '{pb['name']}' execution ({exec_id}) on {len(execution_request.agent_ids)} agents."
    })
    
    return {"status": "enqueued", "executionId": exec_id}

@app.get("/api/playbooks/executions")
def get_playbook_executions():
    return playbook_executions

@app.post("/api/results/decode")
async def decode_result(result_data: dict):
    """Decode command result using AI."""
    command = result_data.get("command", "")
    result = result_data.get("result", "")
    
    decoded = result_decoder.decode_result(command, result)
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Decoded command result: {decoded.get('summary', '')}"
    })
    
    return decoded

# 2. Map Endpoints
@app.get("/api/agents/locations")
def get_agents_locations():
    locations = []
    
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

# 3. Redirector Endpoints
@app.get("/api/redirectors")
def get_redirectors():
    return redirector_simulator.get_redirectors()

@app.post("/api/redirectors")
def create_redirector(request: RedirectorCreateIn):
    redir = redirector_simulator.create_redirector(request.name, request.host, request.port, request.uplink_id)
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Created redirector '{request.name}' ({request.host}:{request.port})."
    })
    return redir

@app.get("/api/redirectors/{redir_id}")
def get_redirector(redir_id: str):
    redir = redirector_simulator.get_redirector(redir_id)
    if not redir:
        raise HTTPException(status_code=404, detail="Redirector not found")
    return redir

@app.put("/api/redirectors/{redir_id}/status")
def update_redirector_status(redir_id: str, status_update: dict):
    new_status = status_update.get("status", "online")
    if redirector_simulator.update_redirector_status(redir_id, new_status):
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "INFO",
            "message": f"Updated redirector {redir_id} status to {new_status}."
        })
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Redirector not found")

@app.get("/api/agents/{agent_id}/redirector-chain")
def get_agent_redirector_chain(agent_id: str):
    return redirector_simulator.get_redirector_chain(agent_id)

@app.delete("/api/redirectors/{redir_id}")
def delete_redirector(redir_id: str):
    if redirector_simulator.delete_redirector(redir_id):
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "WARNING",
            "message": f"Deleted redirector {redir_id}."
        })
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Redirector not found")

# 4. Cryptographic Keys Endpoints
@app.get("/api/crypto/keys")
def get_crypto_keys():
    return list(crypto_keys.values())

@app.post("/api/crypto/keys")
def create_crypto_key(key_request: CryptoKeyIn):
    key_id = f"key-{uuid.uuid4().hex[:8]}"
    import secrets
    new_key = {
        "id": key_id,
        "name": key_request.name,
        "value": secrets.token_hex(16),  # Generate random key
        "algorithm": key_request.algorithm,
        "createdAt": datetime.now().isoformat(),
        "rotatedAt": datetime.now().isoformat(),
        "active": False
    }
    crypto_keys[key_id] = new_key
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Created cryptographic key '{key_request.name}' ({key_request.algorithm})."
    })
    return new_key

@app.put("/api/crypto/keys/{key_id}/activate")
def activate_crypto_key(key_id: str):
    if key_id not in crypto_keys:
        raise HTTPException(status_code=404, detail="Key not found")
    
    # Deactivate all others
    for k in crypto_keys.values():
        k["active"] = False
    
    # Activate this one
    crypto_keys[key_id]["active"] = True
    crypto_keys[key_id]["rotatedAt"] = datetime.now().isoformat()
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"Activated cryptographic key {key_id}. All agents must update PSK."
    })
    return {"status": "activated"}

@app.delete("/api/crypto/keys/{key_id}")
def delete_crypto_key(key_id: str):
    if key_id not in crypto_keys:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if crypto_keys[key_id]["active"]:
        raise HTTPException(status_code=400, detail="Cannot delete active key")
    
    del crypto_keys[key_id]
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "WARNING",
        "message": f"Deleted cryptographic key {key_id}."
    })
    return {"status": "deleted"}

# 5. Settings Endpoints
@app.get("/api/config")
def get_config():
    return system_config

@app.put("/api/config")
def update_config(config: ConfigUpdateIn):
    system_config["security_level"] = config.security_level
    system_config["beacon_interval"] = config.beacon_interval
    system_config["log_level"] = config.log_level
    system_config["enable_ai"] = config.enable_ai
    system_config["enable_encryption"] = config.enable_encryption
    
    system_logs.append({
        "timestamp": datetime.now().isoformat(),
        "level": "INFO",
        "message": f"System configurations updated: SecLevel={config.security_level}, Interval={config.beacon_interval}s, AI={config.enable_ai}, Encryption={config.enable_encryption}"
    })
    return system_config

@app.get("/api/system/status")
def get_system_status():
    uptime = int(time.time() - server_start_time)
    cpu_usage = int(15 + (time.time() % 30))
    ram_usage = int(120 + (time.time() % 45))
    
    return {
        "status": "healthy",
        "uptime": uptime,
        "cpu": cpu_usage,
        "ram": ram_usage,
        "activeAgents": len([x for x in agents_info.values() if x["status"] == "online"]),
        "totalPlaybooks": len(mock_playbooks),
        "dbConnection": "Connected (Neon DB Engine Active)",
        "redirectorsActive": len([r for r in redirector_simulator.redirectors.values() if r.status.value == "online"]),
        "encryptionStatus": "ENABLED" if system_config["enable_encryption"] else "DISABLED"
    }

@app.post("/api/system/diagnose")
def trigger_diagnostics():
    diagnostic_id = f"diag-{uuid.uuid4().hex[:6]}"
    diag_time = datetime.now().isoformat()
    
    diagnostics_steps = [
        {"level": "INFO", "msg": f"[{diagnostic_id}] Diagnostics triggered by Administrator."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Verifying Neon Database connection... Connection latency is 42ms. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Auditing cryptographic keys... {len(crypto_keys)} keys found. Active key valid. OK."},
        {"level": "INFO", "msg": f"[{diagnostic_id}] Checking redirector network... {len(redirector_simulator.redirectors)} redirectors online. OK."},
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

# 6. AI Chat integration
@app.post("/api/ai/chat")
async def chat_with_gemini(chat_input: ChatMessageIn):
    user_msg = chat_input.message
    
    if system_config["enable_ai"] and gemini_model:
        try:
            prompt = f"Eres el asistente de IA integrado en el C2 Aligo. Responde siempre en espanol de forma concisa y profesional.\n\nUsuario: {user_msg}"
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            return {"reply": response.text.strip()}
        except Exception as e:
            system_logs.append({
                "timestamp": datetime.now().isoformat(),
                "level": "ERROR",
                "message": f"Gemini API execution failed: {str(e)}. Falling back to mock assistant."
            })
    
    await asyncio.sleep(1)
    lower_msg = user_msg.lower()
    if "ayuda" in lower_msg or "help" in lower_msg:
        reply = "Puedo ayudarte con: 1) Analizar resultados de comandos, 2) Generar playbooks, 3) Gestionar claves de encriptacion, 4) Monitorear redirectores."
    elif "agente" in lower_msg or "agent" in lower_msg:
        active = len([x for x in agents_info.values() if x['status'] == 'online'])
        reply = f"Actualmente hay {active} agentes activos. Recomiendo ejecutar un playbook de reconocimiento basico."
    elif "playbook" in lower_msg:
        reply = "Los playbooks te permiten automatizar secuencias de comandos. Puedo generar uno desde descripcion en lenguaje natural."
    elif "encriptacion" in lower_msg or "encryption" in lower_msg:
        reply = f"La encriptacion esta {'ACTIVADA' if system_config['enable_encryption'] else 'DESACTIVADA'}. Tienes {len(crypto_keys)} claves disponibles. Puedes rotar claves en Configuracion."
    elif "redirector" in lower_msg:
        active_redirs = len([r for r in redirector_simulator.redirectors.values() if r.status.value == "online"])
        reply = f"Tienes {active_redirs} redirectores activos en la infraestructura. Consulta el mapa tactico para ver conexiones."
    else:
        reply = f"[Simulacion C2]: He recibido tu mensaje: '{user_msg}'. En produccion, esto generaria comandos optimizados."
        
    return {"reply": reply}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
