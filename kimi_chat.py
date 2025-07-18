import os
from groq import Groq
from openai import OpenAI

PROJECT_DIR = os.getcwd()  # Your nock= folder

backend = os.environ.get('KIMI_BACKEND', 'groq')

if backend == 'groq':
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        raise ValueError("Set GROQ_API_KEY env var")
    client = Groq(api_key=api_key)
    model = "llama3-70b-8192"  # Working Groq model for coding
elif backend == 'moonshot':
    api_key = os.environ.get('MOONSHOT_API_KEY')
    if not api_key:
        raise ValueError("Set MOONSHOT_API_KEY env var")
    client = OpenAI(api_key=api_key, base_url="https://api.moonshot.ai/v1")
    model = "kimi-k2-instruct"
else:
    raise ValueError("Invalid backend")

print(f"Using {backend} with {model}")

def read_file(file_path):
    full_path = os.path.join(PROJECT_DIR, file_path)
    try:
        with open(full_path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading: {e}"

def write_file(file_path, content):
    full_path = os.path.join(PROJECT_DIR, file_path)
    try:
        if os.path.exists(full_path):
            confirm = input(f"Overwrite {file_path}? (y/n): ").lower()
            if confirm != 'y':
                return "Cancelled"
        with open(full_path, 'w') as f:
            f.write(content)
        return f"Wrote to {file_path}"
    except Exception as e:
        return f"Error writing: {e}"

def get_response(prompt):
    try:
        if prompt.lower().startswith("read "):
            file_path = prompt[5:].strip()
            return read_file(file_path)
        elif prompt.lower().startswith("write "):
            parts = prompt[6:].split(' ', 1)
            if len(parts) < 2:
                return "Usage: write <file> <content>"
            file_path, content = parts[0], parts[1]
            return write_file(file_path, content)
        elif prompt.lower().startswith("edit "):
            parts = prompt[5:].split(' ', 1)
            if len(parts) < 2:
                return "Usage: edit <file> <instruction>"
            file_path, instruction = parts[0], parts[1]
            content = read_file(file_path)
            if "Error" in content:
                return content
            edit_prompt = f"Original: {content}\nEdit per: {instruction}\nOutput full updated code only."
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": edit_prompt}],
                max_tokens=4096,
                temperature=0.7
            )
            new_content = response.choices[0].message.content
            return write_file(file_path, new_content) + f"\nNew content:\n{new_content}"
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {e}"

# Chat loop
print("\n🚀 Kimi Chat - Type 'exit' to quit. Simple commands: read file.ts, edit file.ts fix bug, write newfile.py code here")
while True:
    prompt = input("Prompt: ").strip()
    if prompt.lower() == 'exit':
        break
    response = get_response(prompt)
    print("\nResponse:\n", response)
