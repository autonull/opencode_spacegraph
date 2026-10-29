#!/usr/bin/env bash
# Applies the SessionSurface seam to a stock upstream checkout.
set -euo pipefail
cd "$(dirname "$0")/.."
git apply --check patches/0001-session-surfaces.patch
git apply patches/0001-session-surfaces.patch
