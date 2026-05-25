#!/bin/bash
# Claude Code PostToolUse hook — appends one line per Write/Edit/NotebookEdit
# to ~/antigravity/shared/activity-log.md so Hermes can see what Claude Code
# has been touching.
#
# Hook stdin is a JSON object: { session_id, tool_name, tool_input{}, tool_response{}, ... }
# We swallow all errors so a hook bug never blocks the tool call.

set -u
log="$HOME/antigravity/shared/activity-log.md"
mkdir -p "$(dirname "$log")"

input=$(cat || true)
[[ -z "$input" ]] && exit 0

# Pull what we need with jq; default to empty on missing/malformed.
tool=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)
sid=$(printf '%s' "$input" | jq -r '(.session_id // "")[0:8]' 2>/dev/null)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // .tool_input.notebook_path // ""' 2>/dev/null)

# Defensive — only log file-mutating tools (matcher should already restrict).
case "$tool" in
  Write|Edit|NotebookEdit) ;;
  *) exit 0 ;;
esac

[[ -z "$file" ]] && exit 0

# Tilde-collapse $HOME for readability.
file=${file/#$HOME/\~}

[[ -z "$sid" ]] && sid="?"

ts=$(date '+%Y-%m-%d %H:%M:%S')
printf -- '- `%s` [claude:%s] **%s** → `%s`\n' "$ts" "$sid" "$tool" "$file" >> "$log"

exit 0
