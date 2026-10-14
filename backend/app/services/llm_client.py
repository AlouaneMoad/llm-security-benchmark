import asyncio
import time
import httpx
from typing import Dict, Any, Optional
from app.config import settings

class LLMClient:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, timeout: Optional[float] = None):
        raw_url = (base_url or settings.openai_base_url).rstrip("/")
        # Normalize: if URL does not end with /v1, and standard OpenAI chat completion requires /v1
        if not raw_url.endswith("/v1"):
            self.base_url = f"{raw_url}/v1"
        else:
            self.base_url = raw_url
        self.api_key = api_key if api_key is not None else settings.openai_api_key
        self.timeout = timeout or settings.request_timeout

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def chat_completion(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Executes a STRICTLY stateless single-turn chat completion.
        Only system_prompt and user_prompt are sent. Zero conversation history or session IDs.
        Includes automatic retry with exponential backoff for transient gateway / rate-limit errors.
        """
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        max_retries = 3
        backoff_delays = [1.5, 3.0, 5.0]
        last_error = ""

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(max_retries):
                try:
                    response = await client.post(url, headers=self._get_headers(), json=payload)
                    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if not choices:
                            return {
                                "success": False,
                                "error": "Provider returned 200 OK but empty choices array",
                                "content": "",
                                "latency_ms": elapsed_ms
                            }

                        first_msg = choices[0].get("message", {})
                        content = first_msg.get("content") or ""
                        return {
                            "success": True,
                            "content": content,
                            "latency_ms": elapsed_ms,
                            "raw_response": data
                        }

                    # Transient HTTP errors that should be retried (429 rate limit, 500, 502, 503, 504 gateway/timeout)
                    if response.status_code in (429, 500, 502, 503, 504) and attempt < max_retries - 1:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        await asyncio.sleep(backoff_delays[attempt])
                        continue

                    error_detail = response.text
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {error_detail}",
                        "content": "",
                        "latency_ms": elapsed_ms
                    }

                except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as e:
                    last_error = f"{type(e).__name__}: {str(e)}"
                    if attempt < max_retries - 1:
                        await asyncio.sleep(backoff_delays[attempt])
                        continue
                except Exception as e:
                    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                    return {
                        "success": False,
                        "error": str(e),
                        "content": "",
                        "latency_ms": elapsed_ms
                    }

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return {
                "success": False,
                "error": f"Request failed after {max_retries} attempts: {last_error}",
                "content": "",
                "latency_ms": elapsed_ms
            }

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection with the configured gateway endpoint."""
        url = f"{self.base_url}/models"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                    return {"status": "connected", "models_available": models}
                # Try fallback without /v1 if root /models is used by provider
                if self.base_url.endswith("/v1"):
                    alt_url = f"{self.base_url[:-3]}/models"
                    alt_resp = await client.get(alt_url, headers=self._get_headers())
                    if alt_resp.status_code == 200:
                        data = alt_resp.json()
                        models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                        return {"status": "connected", "models_available": models}
                return {"status": "error", "message": f"HTTP {response.status_code}: {response.text}"}
            except Exception as e:
                return {"status": "error", "message": str(e)}

llm_client = LLMClient()
