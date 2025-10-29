# Elley AI chat.py (renamed from Electra)
import requests
import sys

API_URL = "http://127.0.0.1:8000/ask-stream"

def main():
    print("===================================================")
    print("    ELLEY STREAMING CHAT (type 'quit' to exit) ")
    print("===================================================")
    while True:
        try:
            query = input("\nYou: ")
            if query.lower() in ['quit', 'exit']:
                print("Goodbye!")
                break
            print("\nAI: ", end="", flush=True)
            with requests.post(API_URL, json={"query": query}, stream=True) as response:
                response.raise_for_status()
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        print(chunk.decode('utf-8'), end="", flush=True)
            print()
        except requests.exceptions.RequestException as e:
            print(f"\n[ERROR] Could not connect to the AI server at {API_URL}. Is it running?")
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            sys.exit(0)

if __name__ == "__main__":
    main()
