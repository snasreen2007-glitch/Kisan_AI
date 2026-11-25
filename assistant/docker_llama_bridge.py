"""
Docker Model Runner & Hugging Face Bridge for Meta Llama 3.2 1B Instruct
Supports:
1. Docker CLI execution: `docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct`
2. Local OpenAI-compatible REST server endpoints (e.g. localhost:11434 or localhost:8000).
3. Integration with on-device ExecuTorch and SQLite grounding layers.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

HUGGINGFACE_MODEL_ID = "meta-llama/Llama-3.2-1B-Instruct"
HUGGINGFACE_MODEL_URL = "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct"
DOCKER_MODEL_TAG = "hf.co/meta-llama/Llama-3.2-1B-Instruct"

DEFAULT_DOCKER_ENDPOINTS = [
    "http://localhost:11434/v1/chat/completions",
    "http://localhost:8000/v1/chat/completions",
    "http://localhost:8080/v1/chat/completions",
]


class DockerLlamaBridge:
    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or self._detect_endpoint()

    def _detect_endpoint(self) -> Optional[str]:
        """Probes local ports to detect active Docker Model Runner or local server."""
        for endpoint in DEFAULT_DOCKER_ENDPOINTS:
            try:
                base_url = endpoint.split("/v1/")[0] + "/v1/models"
                req = urllib.request.Request(base_url, headers={"User-Agent": "CropAssistant"})
                with urllib.request.urlopen(req, timeout=1.0) as resp:
                    if resp.status == 200:
                        return endpoint
            except Exception:
                continue
        return None

    def is_docker_model_running(self) -> bool:
        """Returns True if the Docker Model Runner or compatible server is responding."""
        return self._detect_endpoint() is not None

    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are the on-device AI Crop Care Assistant.",
        max_tokens: int = 512,
        temperature: float = 0.2
    ) -> Optional[str]:
        """Calls the local Docker Model Runner endpoint using standard chat completions API."""
        endpoint = self.endpoint_url or self._detect_endpoint()
        if not endpoint:
            return None

        payload = {
            "model": HUGGINGFACE_MODEL_ID,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "CropAssistant"}
        )

        try:
            with urllib.request.urlopen(req, timeout=15.0) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[DockerLlamaBridge] Request to {endpoint} failed: {e}")
            return None


def get_docker_run_command() -> str:
    """Returns the exact command to run Meta Llama 3.2 1B Instruct in Docker."""
    return f"docker model run {DOCKER_MODEL_TAG}"


if __name__ == "__main__":
    bridge = DockerLlamaBridge()
    print("=== Meta Llama 3.2 1B Instruct Docker & HuggingFace Bridge ===")
    print(f"Hugging Face Model URL : {HUGGINGFACE_MODEL_URL}")
    print(f"Docker Run Command     : {get_docker_run_command()}")
    print(f"Docker Runner Active   : {bridge.is_docker_model_running()}")
    if bridge.is_docker_model_running():
        print(f"Connected Endpoint     : {bridge.endpoint_url}")
    else:
        print("Status: Offline (Local on-device ExecuTorch / Client engine active)")

