#!/usr/bin/env bash
# Reverts the reference-only SessionSurface seam from a stock upstream checkout.
set -euo pipefail
cd "$(dirname "$0")/../../.."
git apply --check --reverse docs/spacegraph/seam/0001-session-surfaces.patch
git apply --reverse docs/spacegraph/seam/0001-session-surfaces.patch
