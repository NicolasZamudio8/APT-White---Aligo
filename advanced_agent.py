import asyncio
import websockets
import json
import uuid
import platform
import base64
import time
import ssl
import urllib.request
import urllib.error
from urllib.parse import urljoin

try:
    from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    X25519PrivateKey = None
    X25519PublicKey = None
    AESGCM = None

BASE_URL = "http://localhost:8000"


def is_crypto_available() -> bool:
    return X25519PrivateKey is not None and X25519PublicKey is not None and AESGCM is not None


def derive_key(shared_secret: bytes) -> bytes:
    return __import__("hashlib").sha256(shared_secret).digest()


def encrypt_payload(key: bytes, plaintext: str) -> str:
    if not key or not is_crypto_available():
        return base64.b64encode(plaintext.encode()).decode()
    aesgcm = AESGCM(key)
    nonce = __import__("secrets").token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_payload(key: bytes, payload_b64: str) -> str:
    raw = base64.b64decode(payload_b64)
    if not key or not is_crypto_available():
        return raw.decode()
    aesgcm = AESGCM(key)
    nonce, ciphertext = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode()


def http_post(path: str, data: dict, headers: dict = None) -> dict:
    url = urljoin(BASE_URL, path)
    payload = json.dumps(data).encode()
    request = urllib.request.Request(url, data=payload, headers=headers or {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"[-] HTTP error during fallback: {e.code} {e.reason}")
    except Exception as e:
        print(f"[-] HTTP fallback failed: {e}")
    return {}


async def execute_command(agent_id: str, os_name: str, cmd: str, key: bytes, websocket=None, transport=None):
    print(f"[!] Executing command via {transport}: {cmd}")
    await asyncio.sleep(2)
    result_payload = {
        "agent_id": agent_id,
        "type": "result",
        "result": f"[MOCK OS: {os_name}] Ejecutado '{cmd}' con exito. (simulacion)"
    }
    encoded = encrypt_payload(key, json.dumps(result_payload)) if key else base64.b64encode(json.dumps(result_payload).encode()).decode()
    if websocket is not None:
        await websocket.send(json.dumps({"type": "encrypted", "payload": encoded}) if key else json.dumps(result_payload))
        print("[+] Result sent back on WebSocket.")
        return
    if transport == "http_poll":
        http_post(f"/api/agent/poll/{agent_id}", {"type": "result", "payload": encoded})
    elif transport == "dns_tunnel":
        record = base64.b64encode(encoded.encode()).decode()
        http_post(f"/api/agent/dns/{agent_id}", {"dns_record": record})
    else:
        print("[-] No transport available for result delivery.")


async def run_ws(agent_id: str, os_name: str):
    uri = f"ws://localhost:8000/ws/{agent_id}"
    key = None
    if is_crypto_available():
        private_key = X25519PrivateKey.generate()
        public_bytes = private_key.public_key().public_bytes(
            encoding=__import__("cryptography.hazmat.primitives.serialization", fromlist=["serialization"]).Encoding.Raw,
            format=__import__("cryptography.hazmat.primitives.serialization", fromlist=["serialization"]).PublicFormat.Raw
        )
        handshake = {"type": "handshake", "public_key": base64.b64encode(public_bytes).decode()}
    else:
        handshake = {"type": "handshake", "public_key": None}

    try:
        async with websockets.connect(uri) as websocket:
            print("[+] Connected to C2 mock server via WebSocket.")
            await websocket.send(json.dumps(handshake))
            key = None
            if is_crypto_available():
                response = json.loads(await websocket.recv())
                if response.get("type") == "handshake_ack" and response.get("public_key"):
                    peer = base64.b64decode(response["public_key"])
                    key = derive_key(X25519PrivateKey.generate().exchange(X25519PublicKey.from_public_bytes(peer)))
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                if data.get("type") == "encrypted" and key:
                    payload = json.loads(decrypt_payload(key, data.get("payload", "")))
                else:
                    payload = data
                if payload.get("type") == "commands":
                    for cmd_item in payload.get("payload", []):
                        cmd = cmd_item.get("data")
                        await execute_command(agent_id, os_name, cmd, key, websocket=websocket, transport="ws")
                if payload.get("kill"):
                    print("[!] Dead man switch activated. Cleaning up and exiting.")
                    return
    except Exception as e:
        print(f"[-] WebSocket error: {e}")
        return None


async def fallback_loop(agent_id: str, os_name: str):
    key = None
    transport = "http_poll"
    while True:
        print(f"[*] Fallback transport active: {transport}")
        beacon = {"type": "beacon", "beacon": {"os": os_name, "timestamp": int(time.time())}}
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "image/webp,image/apng,*/*"
        }
        if transport == "http_poll":
            response = http_post(f"/api/agent/poll/{agent_id}", beacon, headers=headers)
        else:
            record = base64.b64encode(json.dumps(beacon).encode()).decode()
            response = http_post(f"/api/agent/dns/{agent_id}", {"dns_record": record}, headers=headers)
            if response and response.get("dns_response"):
                response = json.loads(base64.b64decode(response["dns_response"]).decode())
        if response.get("type") == "commands":
            for cmd_item in response.get("payload", []):
                cmd = cmd_item.get("data")
                await execute_command(agent_id, os_name, cmd, key, websocket=None, transport=transport)
        if response.get("kill"):
            print("[!] Dead man switch received via fallback. Exiting.")
            return
        transport = "dns_tunnel" if transport == "http_poll" else "http_poll"
        await asyncio.sleep(10)


async def agent():
    agent_id = str(uuid.uuid4())
    os_name = platform.system()
    print(f"[*] Starting Mock Agent {agent_id} on {os_name}...")
    ws_result = await run_ws(agent_id, os_name)
    if ws_result is None:
        await fallback_loop(agent_id, os_name)


if __name__ == "__main__":
    asyncio.run(agent())
