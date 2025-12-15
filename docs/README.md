# Threads MCP Server - GitHub Pages

This directory contains the GitHub Pages website for the Threads MCP Server project.

## Website

Visit: [https://pegasusheavyindustries.github.io/threads-mcp/](https://pegasusheavyindustries.github.io/threads-mcp/)

## Files

- `index.html` - Main website HTML with Threads-inspired design
- `styles.css` - Threads-themed CSS with dark mode support
- `README.md` - This file

## Design

The website is themed after Threads.com with:
- Clean, minimalist black and white design
- Inter font family (Threads' default)
- Smooth animations and transitions
- Responsive mobile-first layout
- Dark mode support
- Copy-to-clipboard functionality for code blocks

## Deployment

The site is automatically deployed via GitHub Actions when changes are pushed to the main branch.

See `.github/workflows/deploy-pages.yml` for the deployment configuration.

## Local Development

To view the site locally, simply open `index.html` in a web browser:

```bash
# From the project root
open docs/index.html

# Or use a local server
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

## Customization

To update the site:
1. Edit `index.html` for content changes
2. Edit `styles.css` for styling changes
3. Commit and push to main branch
4. GitHub Actions will automatically deploy

---

**Pegasus Heavy Industries LLC** | MIT License | 2025

