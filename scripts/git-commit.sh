#!/usr/bin/env bash
# Stage relevant app changes and create a git commit.
# Usage:
#   ./scripts/git-commit.sh
#   ./scripts/git-commit.sh "your commit message"
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  :
else
  echo "Nothing to commit."
  exit 0
fi

MSG="${1:-}"

git add -A
# Never commit secrets / local tooling noise
git reset HEAD -- .env.local .env.local.dead-supabase.bak 2>/dev/null || true
git reset HEAD -- .poolside .agents image.png skills-lock.json 2>/dev/null || true

if [[ -z "$(git diff --cached --name-only)" ]]; then
  echo "Nothing staged after excludes."
  exit 0
fi

if [[ -z "$MSG" ]]; then
  MSG="$(cat <<'EOF'
Update local blog changes.

EOF
)"
fi

git commit -m "$MSG"
git status --short
echo "Committed: $(git log -1 --oneline)"
