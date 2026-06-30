#!/usr/bin/env bash
set -euo pipefail

npm run lint
npm run build

printf '\nResonance Lab production validation passed.\n'
