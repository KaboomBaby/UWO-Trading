#!/bin/zsh
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CONFIG="$CODEX_HOME/config.toml"
MODELS="$CODEX_HOME/models.json"
ZSHRC="$HOME/.zshrc"

[[ -f "$CONFIG" ]] || { print "Missing $CONFIG" >&2; exit 1; }
mkdir -p "$CODEX_HOME"
stamp=$(date +%Y%m%d-%H%M%S)
cp "$CONFIG" "$CONFIG.backup-$stamp"
if [[ -f "$MODELS" ]]; then
  cp "$MODELS" "$MODELS.backup-$stamp"
fi

python3 - "$CONFIG" "$MODELS" <<'PY'
import json
import re
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
models_path = Path(sys.argv[2])
config = config_path.read_text()

if not re.search(r'(?m)^model\s*=\s*"glm-5\.3-flash"\s*$', config):
    raise SystemExit("Expected current model glm-5.3-flash; no changes made")

config = re.sub(
    r'(?m)^model\s*=\s*"glm-5\.3-flash"\s*$',
    'model = "glm-5.3"',
    config,
    count=1,
)
config_path.write_text(config)

models_path.parent.mkdir(parents=True, exist_ok=True)
if models_path.exists():
    catalog = json.loads(models_path.read_text())
else:
    catalog = {"models": []}

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

touch "$ZSHRC"
if ! grep -q "BEGIN CODEX GLM" "$ZSHRC"; then
  cat >> "$ZSHRC" <<'EOF'

# BEGIN CODEX GLM
# Force GLM and translate the shorthand --yolo to Codex's explicit flag.
codex() {
  local -a args=()
  local arg
  for arg in "$@"; do
    case "$arg" in
      --yolo) args+=(--dangerously-bypass-approvals-and-sandbox) ;;
      *) args+=("$arg") ;;
    esac
  done
  command codex -m 'glm-5.3' -c 'model_provider="ZAI"' "${args[@]}"
}
# END CODEX GLM
EOF
fi

print "Updated $CONFIG and $MODELS."
print "Installed the GLM Codex wrapper in $ZSHRC."
print "Run: exec zsh"
print "Then start: codex --yolo"
