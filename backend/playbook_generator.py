"""AI-assisted playbook generator using Gemini."""

import json
from typing import Dict, List, Optional
import re

try:
    import google.generativeai as genai
except ImportError:
    genai = None

class PlaybookGenerator:
    """Generate structured playbooks from natural language using Gemini."""
    
    def __init__(self, gemini_model=None):
        self.model = gemini_model
    
    @staticmethod
    def parse_playbook_json(response_text: str) -> Optional[Dict]:
        """Extract JSON playbook from Gemini response."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{[^{}]*"steps"[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
        except Exception as e:
            print(f"[!] Failed to parse playbook JSON: {e}")
        return None
    
    def generate_playbook(self, natural_language_request: str) -> Optional[Dict]:
        """Generate a playbook from natural language description."""
        if not self.model:
            return self._generate_mock_playbook(natural_language_request)
        
        try:
            prompt = f"""
You are a cybersecurity expert C2 command generator. Generate a structured JSON playbook based on the user's request.

The JSON must have this structure:
{{
  "name": "Playbook Name",
  "description": "What this playbook does",
  "steps": [
    {{"command": "command1", "delay": 2}},
    {{"command": "command2", "delay": 3}}
  ]
}}

User request: {natural_language_request}

Generate ONLY valid JSON, no additional text.
"""
            response = self.model.generate_content(prompt)
            return self.parse_playbook_json(response.text)
        except Exception as e:
            print(f"[!] Gemini generation failed: {e}")
            return self._generate_mock_playbook(natural_language_request)
    
    @staticmethod
    def _generate_mock_playbook(request: str) -> Dict:
        """Generate mock playbook based on keywords."""
        lower_req = request.lower()
        
        if "reconocimiento" in lower_req or "reconnaissance" in lower_req:
            return {
                "name": "Red Reconnaissance",
                "description": "Basic network reconnaissance playbook",
                "steps": [
                    {"command": "whoami", "delay": 2},
                    {"command": "ipconfig", "delay": 2},
                    {"command": "netstat", "delay": 3}
                ]
            }
        elif "auditor" in lower_req or "audit" in lower_req:
            return {
                "name": "System Audit",
                "description": "System audit and enumeration playbook",
                "steps": [
                    {"command": "hostname", "delay": 1},
                    {"command": "uname", "delay": 2},
                    {"command": "ps", "delay": 3}
                ]
            }
        else:
            return {
                "name": "Custom Playbook",
                "description": f"Custom playbook based on: {request}",
                "steps": [
                    {"command": "whoami", "delay": 2},
                    {"command": "ipconfig", "delay": 2}
                ]
            }

class ResultDecoder:
    """Decode technical command results to human-readable explanations."""
    
    def __init__(self, gemini_model=None):
        self.model = gemini_model
    
    def decode_result(self, command: str, result: str) -> Dict:
        """Translate command result to human explanation."""
        if not self.model:
            return self._generate_mock_explanation(command, result)
        
        try:
            prompt = f"""
You are a cybersecurity analyst. Explain the following command output in simple, professional Spanish.
Provide: 1) What the output means, 2) Any security implications, 3) Recommended next actions.

Command: {command}
Output:
{result}

Respond in JSON format:
{{
  "summary": "One-line summary",
  "explanation": "Detailed explanation",
  "implications": ["implication1", "implication2"],
  "nextSteps": ["action1", "action2"]
}}
"""
            response = self.model.generate_content(prompt)
            try:
                return json.loads(response.text)
            except:
                return {"summary": response.text, "explanation": result}
        except Exception as e:
            return self._generate_mock_explanation(command, result)
    
    @staticmethod
    def _generate_mock_explanation(command: str, result: str) -> Dict:
        """Generate mock explanation."""
        return {
            "summary": f"Executed: {command}",
            "explanation": f"Command '{command}' was executed successfully. Output returned {len(result)} characters.",
            "implications": ["Standard command execution"],
            "nextSteps": ["Review output for anomalies", "Execute follow-up commands as needed"]
        }
