#!/bin/zsh
set -euo pipefail

stamp=$(date +%Y%m%d-%H%M%S)
roots=(
  "$PWD/.codex"
  "$HOME/.codex"
)

for root in $roots; do
  config="$root/config.toml"
  models="$root/models.json"
  [[ -f "$config" ]] || continue

  cp "$config" "$config.backup-$stamp"
  if [[ -f "$models" ]]; then
    cp "$models" "$models.backup-$stamp"
  fi

  python3 - "$config" "$models" <<'PY'
import json
import re
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
models_path = Path(sys.argv[2])
config = config_path.read_text()

config = re.sub(r'(?m)^model\s*=\s*"[^"]*"\s*$', 'model = "glm-5.3"', config)
config = re.sub(r'(?m)^model_provider\s*=\s*"[^"]*"\s*$', 'model_provider = "ZAI"', config)

if not re.search(r'(?m)^model\s*=\s*"glm-5\.3"\s*$', config):
    config = 'model = "glm-5.3"\n' + config
if not re.search(r'(?m)^model_provider\s*=\s*"ZAI"\s*$', config):
    config = 'model_provider = "ZAI"\n' + config

config_path.write_text(config)

if not models_path.exists():
    catalog = {"models": []}
else:
    catalog = json.loads(models_path.read_text())

models = catalog.setdefault("models", [])
models = [model for model in models if model.get("slug") != "glm-5.3"]
template = next(
    (model for model in models if model.get("slug") == "glm-5.3-flash"),
    {
        "description": "Z.ai flagship GLM model supported by Codex Responses",
        "default_reasoning_level": "max",
        "supported_reasoning_levels": [
            {"effort": "low", "description": "Light reasoning"},
            {"effort": "high", "description": "Enhanced reasoning"},
            {"effort": "max", "description": "Deep reasoning"},
        ],
        "shell_type": "shell_command",
        "visibility": "list",
        "supported_in_api": True,
        "priority": 0,
        "base_instructions": "",
        "supports_reasoning_summaries": True,
        "default_reasoning_summary": "none",
        "support_verbosity": False,
        "apply_patch_tool_type": "freeform",
        "truncation_policy": {"mode": "bytes", "limit": 10000},
        "context_window": 1048576,
        "max_context_window": 1048576,
        "effective_context_window_percent": 95,
        "supports_parallel_tool_calls": True,
        "experimental_supported_tools": [],
        "input_modalities": ["text"],
    },
)

glm = dict(template)
glm.update(
    {
        "slug": "glm-5.3",
        "display_name": "glm-5.3",
        "description": "Z.ai flagship GLM model supported by Codex Responses",
        "input_modalities": ["text"],
    }
)
models.insert(0, glm)
catalog["models"] = models
models_path.write_text(json.dumps(catalog, indent=2) + "\n")
PY
done

zshrc="$HOME/.zshrc"
touch "$zshrc"
if ! grep -q "BEGIN OMX GLM YOLO" "$zshrc"; then
  cat >> "$zshrc" <<'EOF'

# BEGIN OMX GLM YOLO
# Run interactive `omx --yolo` sessions in a distinct state root so an active
# ChatGPT/Codex conversation in this checkout does not conflict with them.
omx() {
  if [[ "${1:-}" == "--yolo" ]]; then
    shift
    local root="${OMX_GLM_ROOT:-$HOME/.omx/instances/uwo-trading-glm-yolo}"
    OMX_ROOT="$root" command omx --madmax "$@"
    return
  fi
  command omx "$@"
}
# END OMX GLM YOLO
EOF
fi

print "GLM 5.3 configured for OMX and Codex."
print "Installed the omx --yolo compatibility wrapper."
print "Run: exec zsh && omx --yolo"
