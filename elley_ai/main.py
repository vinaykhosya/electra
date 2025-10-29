import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import json

# --- CONFIGURATION ---
OLLAMA_API_URL = 'http://localhost:11434/api/generate'
LLM_MODEL = 'llama3'

# --- FASTAPI APPLICATION ---
app = FastAPI(
    title="Elley Proxy",
    description="A simple API that forwards requests directly to the Elley model.",
    version="1.0.0"
)

class OllamaRequest(BaseModel):
    query: str

def stream_ollama_response(payload: dict):
    try:
        # Recipe query detection removed - no Google/YouTube results shown
        response = requests.post(OLLAMA_API_URL, json=payload, stream=True, timeout=60)
        response.raise_for_status()
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line)
                yield chunk.get('response', '')
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Could not stream from Ollama: {e}")
        yield "Sorry, there was an error connecting to the AI model."

@app.post("/ask-stream")
def ask_ollama_stream(request: OllamaRequest):
    # --- PROMPT WITH PERSONA ---
    # This prompt instructs the AI to act as Elley.
    prompt_with_persona = f"""
    You are Elley, a helpful and creative culinary assistant integrated into the ElectraWireless smart home app.
    A user has asked for the following: "{request.query}"
    Provide a clear and helpful response in well-structured Markdown format.
    """

    payload = {
        "model": LLM_MODEL,
        "prompt": prompt_with_persona,
        "stream": True
    }
    
    return StreamingResponse(stream_ollama_response(payload), media_type="text/event-stream")

if __name__ == "__main__":
    print(f"--- Starting Elley Streaming Server ---")
    print(f"Forwarding requests to model: '{LLM_MODEL}'")
    uvicorn.run("main:app", host="127.0.0.1", port=8000)

