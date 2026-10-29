#!/usr/bin/env bash
# Reverts the SessionSurface seam.
set -euo pipefail
cd "$(dirname "$0")/.."
git apply --check --reverse patches/0001-session-surfaces.patch
git apply --reverse patches/0001-session-surfaces.patch
