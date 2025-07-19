#!/bin/bash
# Quick context loader for Claude Code prompts

CONTEXT_TYPE="$1"
TASK="$2"

if [ -z "$CONTEXT_TYPE" ]; then
    echo "🎯 NOCKCHAIN CLAUDE CODE CONTEXT LOADER"
    echo "====================================="
    echo ""
    echo "Available contexts:"
    echo "  agent     - 21-agent system development"
    echo "  revenue   - \$847K revenue system"
    echo "  dex       - DeFi & trading systems"
    echo "  security  - Security & compliance"
    echo ""
    echo "Usage: ./claude-context.sh [context] '[task description]'"
    echo "Example: ./claude-context.sh revenue 'optimize billing performance'"
    echo ""
    echo "Available templates:"
    ls /Users/Patrick/nock=/docs/claude-templates/ 2>/dev/null || echo "  No templates found"
    exit 1
fi

TEMPLATE_FILE="/Users/Patrick/nock=/docs/claude-templates/${CONTEXT_TYPE}-context.md"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Context template not found: $TEMPLATE_FILE"
    echo ""
    echo "Available templates:"
    ls /Users/Patrick/nock=/docs/claude-templates/ 2>/dev/null || echo "  No templates directory found"
    exit 1
fi

echo "📋 CLAUDE CODE CONTEXT READY"
echo "================================"
echo ""
cat "$TEMPLATE_FILE"
echo ""
echo "================================"
echo "🎯 SPECIFIC TASK: $TASK"
echo ""
echo "✅ Copy the above context and paste into Claude Code"
echo "📝 Replace [Your specific ${CONTEXT_TYPE} task here] with: $TASK"
echo ""
echo "💡 Quick file reference:"
echo "Repository Navigator: docs/auto-generated/repo-navigator.md"
echo "File count: $(find /Users/Patrick/nock= -type f -not -path '*/node_modules*' -not -path '*/.git*' | wc -l | xargs) files"