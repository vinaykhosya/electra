import requests
import sys

# The URL of our new streaming endpoint from main.py
API_URL = "http://127.0.0.1:8000/ask-stream"

def main():
    """
    Main function to run the interactive streaming chat client.
    """
    print("===================================================")
    print("    ELECTRA AI STREAMING CHAT (type 'quit' to exit) ")
    print("===================================================")
    
    while True:
        try:
            # Get input from the user
            query = input("\nYou: ")
            if query.lower() in ['quit', 'exit']:
                print("Goodbye!")
                break
            
            # Print the prefix for the AI's response, but don't add a newline yet.
            # flush=True ensures "AI: " appears immediately.
            print("\nAI: ", end="", flush=True)

            # Make the request with streaming enabled. This opens a connection that stays alive.
            with requests.post(API_URL, json={"query": query}, stream=True) as response:
                response.raise_for_status()
                
                # Iterate over the content chunks as they arrive from the server.
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        # Decode the chunk from bytes to a string and print it.
                        # end="" prevents a new line after each word.
                        # flush=True forces the text to appear on screen instantly.
                        print(chunk.decode('utf-8'), end="", flush=True)
            
            # After the entire stream is finished, print a final newline to clean up.
            print()

        except requests.exceptions.RequestException as e:
            print(f"\n[ERROR] Could not connect to the AI server at {API_URL}. Is it running?")
        except (KeyboardInterrupt, EOFError):
            # Handle Ctrl+C or Ctrl+D to exit gracefully.
            print("\nGoodbye!")
            sys.exit(0)

# Standard Python entry point
if __name__ == "__main__":
    main()

