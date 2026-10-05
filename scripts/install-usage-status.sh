#!/bin/zsh
set -euo pipefail

REPO_DIR="${0:A:h:h}"
WIDGET="$REPO_DIR/scripts/usage-status.mjs"
ZSHRC="$HOME/.zshrc"

chmod +x "$WIDGET"
touch "$ZSHRC"

if grep -q "terminal usage status" "$ZSHRC"; then
  print "Terminal usage prompt is already installed."
  exit
fi

cat >> "$ZSHRC" <<EOF

# terminal usage status
setopt prompt_subst
PROMPT=\$'\\n%F{cyan}%~%f\\n%F{magenta}\$(command -v bun >/dev/null && bun "$WIDGET" || node "$WIDGET")%f\\n%F{green}❯%f '
# end terminal usage status
EOF

print "Installed. Run: exec zsh"
