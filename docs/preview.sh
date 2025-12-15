#!/bin/bash
# Preview the GitHub Pages site locally

echo "🌐 Starting local preview server..."
echo ""
echo "Open your browser to: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "Error: Python is not installed"
    echo "Please install Python to preview the site locally"
    exit 1
fi

