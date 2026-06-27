"""Encryption utilities for C2 communications."""

import json
from typing import Dict, Any, Optional

class EncryptionManager:
    """Symmetric encryption manager for C2 payloads."""
    
    @staticmethod
    def xor_cipher(data: str, key: str) -> str:
        """Simple XOR cipher for payload obfuscation."""
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
    def encrypt_command(command: Dict[str, Any], psk: str) -> Dict[str, Any]:
        """Encrypt command with PSK."""
        json_str = json.dumps(command)
        encrypted = EncryptionManager.xor_cipher(json_str, psk)
        return {"_encrypted": encrypted, "_v": 1}
    
    @staticmethod
    def decrypt_payload(payload: Dict[str, Any], psk: str) -> Optional[Dict[str, Any]]:
        """Decrypt payload with PSK."""
        try:
            if payload.get("_v") == 1 and "_encrypted" in payload:
                decrypted = EncryptionManager.xor_decipher(payload["_encrypted"], psk)
                return json.loads(decrypted)
        except Exception as e:
            print(f"[!] Decryption failed: {e}")
        return None
