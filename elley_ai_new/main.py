# Elley AI main.py (renamed from Electra)
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

def google_search(query):
    url = f"https://www.google.com/search?q={query.replace(' ', '+')}+recipe"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    result = soup.find('h3')
    if result:
        return result.text
    return "No Google result found."

def youtube_search(query):
    url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}+recipe"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    for link in soup.find_all('a'):
        href = link.get('href', '')
        if href.startswith('/watch'):
            return f"https://www.youtube.com{href}"
    return "No YouTube video found."

def stream_ollama_response(payload: dict, recipe_query=None):
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
    # Detect recipe queries
    recipe_query = None
    if any(word in request.query.lower() for word in ["recipe", "how to cook", "make", "prepare"]):
        recipe_query = request.query
    return StreamingResponse(stream_ollama_response(payload, recipe_query), media_type="text/event-stream")

if __name__ == "__main__":
    print(f"--- Starting Elley Streaming Server ---")
    print(f"Forwarding requests to model: '{LLM_MODEL}'")
    uvicorn.run("main:app", host="127.0.0.1", port=8000)