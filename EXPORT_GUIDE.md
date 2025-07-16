# NOCKCHAIN EXPORT GUIDE
## How to Export the Full Project for AI/Client Contexts

This guide documents the complete process to export the Nockchain project into a single, optimized JSON file. Use this for new AI sessions, client handoffs, or backups. The export includes full content for docs/plans/handover/key files and paths for source code (to keep size manageable, avoiding "Parsing failed" errors).

### Prerequisites
- Python 3 (pre-installed in Lightning AI).
- jq (install if needed: `sudo apt-get install -y jq`).

### Export Script: create_smart_export.py
Save this Python script in project root and run it to generate the JSON.

```python
import os
import json
from datetime import datetime

def create_smart_export():
    target_dir = os.getcwd()
    export_dir = os.path.join(target_dir, 'exports')
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(export_dir, f'nockchain_smart_export_{timestamp}.json')

    handover_path = os.path.join(target_dir, 'handover')
    plan_paths = [os.path.join(target_dir, p) for p in ["Projectplan.md", "Nockchainprojectplan.md"] if os.path.exists(os.path.join(target_dir, p))]
    key_file_paths = [os.path.join(target_dir, f) for f in ["README.md", "CLAUDE.md", "package.json", "docker-compose.yml"] if os.path.exists(os.path.join(target_dir, f))]

    source_code_extensions = ['.ts', '.js', '.rs', '.css', '.sh', '.py']

    def get_content(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return None

    os.makedirs(export_dir, exist_ok=True)
    git_commit = os.popen('git rev-parse --short HEAD').read().strip()

    print("Creating smart export package...")

    handover_files = [os.path.join(handover_path, f) for f in os.listdir(handover_path) if f.endswith('.md')] if os.path.isdir(handover_path) else []

    final_package = {
        "metadata": {
            "export_type": "complete_client_package",
            "export_date": datetime.utcnow().isoformat() + "Z",
            "project": "NOCKCHAIN",
            "exported_from": "Lightning AI Environment",
            "git_commit": git_commit,
            "package_contents": ["handover_documents", "project_plans", "key_files", "source_code_inventory"]
        },
        "handover_documents": [{"file_name": os.path.basename(p), "file_path": p, "content": get_content(p)} for p in handover_files if get_content(p)],
        "project_plans": [{"file_name": os.path.basename(p), "file_path": p, "content": get_content(p)} for p in plan_paths if get_content(p)],
        "key_files": [{"file_name": os.path.basename(p), "file_path": p, "content": get_content(p)} for p in key_file_paths if get_content(p)],
        "source_code_inventory": []
    }

    for root, _, files in os.walk(target_dir):
        if '.git' in root or 'node_modules' in root or 'exports' in root:
            continue
        for file in files:
            if any(file.endswith(ext) for ext in source_code_extensions):
                final_package["source_code_inventory"].append(os.path.join(root, file))

    print(f"Writing package to {output_file}...")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_package, f, indent=2)
        print("✅ Success! Smart export created.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_smart_export()
