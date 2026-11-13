#!/bin/bash
set -e

SCREENSHOTS_DIR="/home/me/opencode_spacegraph/docs/spacegraph/screenshots"
OUTPUT_DIR="/home/me/opencode_spacegraph/docs/spacegraph/video/stills"
mkdir -p "$OUTPUT_DIR"

# Frame: caption (job | action | payoff)
declare -A captions=(
  ["story-01-attention-badge.png"]="Diagnose | Attention badge flags failure instantly | No log scrolling needed"
  ["story-02-why-trace.png"]="Diagnose | Click 'Why' for causal trace | One click vs hunting error"
  ["story-03-palette-failed-tools.png"]="Audit | NLQ: 'failed tools' jumps to node | Natural language navigation"
  ["story-04-shell-inspector.png"]="Audit | Inspector shows failed command details | Context without leaving map"
  ["story-05-wrong-fix-diff.png"]="Audit | Diff widget reveals bad edit | See wrong fix at a glance"
  ["story-06-hierarchy-subagent.png"]="Delegate | Hierarchy layout shows delegation | Subagent structure visible"
  ["story-07-subagent-finding.png"]="Delegate | Subagent trace shows root cause | Found missing store write"
  ["story-08-permalink.png"]="Share | Copy permalink in one click | Teammate opens exact node"
)

for frame in "${!captions[@]}"; do
  input="$SCREENSHOTS_DIR/$frame"
  output="$OUTPUT_DIR/$frame"
  caption="${captions[$frame]}"
  
  echo "Annotating $frame..."
  
  # Add caption at bottom with semi-transparent background
  magick "$input" \
    -gravity south \
    -background '#00000080' \
    -fill white \
    -font /usr/share/fonts/noto/NotoSans-Regular.ttf \
    -pointsize 24 \
    -annotate +0+20 "$caption" \
    "$output"
done

echo "All stills annotated in $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
