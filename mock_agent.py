import asyncio
import websockets
import json
import uuid
import sys
import platform

async def agent():
    agent_id = str(uuid.uuid4())
    os_name = platform.system()
    uri = f"ws://localhost:8000/ws/{agent_id}-mock-{os_name}"
    
    print(f"[*] Starting Mock Agent {agent_id} on {os_name}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("[+] Connected to C2 Mock Server.")
            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data.get("type") == "command":
                        cmd = data.get("data")
                        print(f"[!] Received Command: {cmd}")
                        await asyncio.sleep(2) # simulate execution
                        
                        result_payload = {
                            "agent_id": agent_id,
                            "result": f"[MOCK OS: {os_name}] Executed '{cmd}' successfully. (This is a simulation)"
                        }
                        await websocket.send(json.dumps(result_payload))
                        print("[+] Result sent back.")
                except websockets.exceptions.ConnectionClosed:
                    print("[-] Connection closed by server.")
                    break
    except Exception as e:
        print(f"[-] Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(agent())
