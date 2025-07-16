import os
import json
from datetime import datetime

def create_smart_export():
    """
    Creates a structured, size-optimized JSON export for AI context.
    Includes full content for key docs/plans/handover, but only paths for source code.
    """
    target_dir = os.getcwd()
    export_dir = os.path.join(target_dir, 'exports')
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(export_dir, f'nockchain_smart_export_{timestamp}.json')

    # Define categories based on project structure
    handover_path = os.path.join(target_dir, 'handover')
    plan_paths = [os.path.join(target_dir, p) for p in ["Projectplan.md", "Nockchainprojectplan.md"] if os.path.exists(os.path.join(target_dir, p))]
    key_file_paths = [os.path.join(target_dir, f) for f in ["README.md", "CLAUDE.md", "package.json", "docker-compose.yml"] if os.path.exists(os.path.join(target_dir, f))]

    source_code_extensions = ['.ts', '.js', '.rs', '.css', '.sh', '.py']

    # Helper to get file content
    def get_content(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return None

    # Main logic
    os.makedirs(export_dir, exist_ok=True)
    git_commit = os.popen('git rev-parse --short HEAD').read().strip()

    print("Creating smart export package...")

    # Process handover docs
    handover_files = [os.path.join(handover_path, f) for f in os.listdir(handover_path) if f.endswith('.md')] if os.path.isdir(handover_path) else []

    # Assemble package
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

    # Source code paths only
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
