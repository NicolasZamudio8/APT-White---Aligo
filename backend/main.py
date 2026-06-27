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

# Setup Gemini API key
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
            if "result" in payload:
                mock_results.append(payload)
                # Append execution details to system logs
                system_logs.append({
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": f"Received execution result from agent {agent_id}."
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
        await active_connections[agent_id].send_text(json.dumps({"type": "command", "data": cmd_text}))
        system_logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": "INFO",
            "message": f"Command '{cmd_text}' dispatched to agent {agent_id}."
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
            if agent_id in active_connections:
                try:
                    await active_connections[agent_id].send_text(
                        json.dumps({"type": "command", "data": step["command"]})
                    )
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
