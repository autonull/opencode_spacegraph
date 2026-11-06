#!/usr/bin/env bash
# Applies the reference-only SessionSurface seam to a stock upstream checkout.
set -euo pipefail
cd "$(dirname "$0")/../../.."
git apply --check docs/spacegraph/seam/0001-session-surfaces.patch
git apply docs/spacegraph/seam/0001-session-surfaces.patch
