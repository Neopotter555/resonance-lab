#!/usr/bin/env bash
set -euo pipefail

npm run validate

if [[ -n "${SMOKE_URL:-}" ]]; then
  npm run smoke:visual
  npm run smoke:workflow
else
  printf '\nSet SMOKE_URL to run visual and workflow smoke checks against a deployed URL.\n'
fi

printf '\nResonance Lab production validation passed.\n'
