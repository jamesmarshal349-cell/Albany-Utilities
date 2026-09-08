export function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Simple standalone HTML page shown in the browser after the Roblox OAuth
// redirect — the "message" param may contain the intentional <strong> tag
// from the callback route, everything else passed through it is escaped
// before interpolation at the call site.
export function renderAuthResultPage({ title, message, isError = false }) {
    const accent = isError ? '#e74c3c' : '#FFD45E';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e1f22;
    color: #dcddde;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
    box-sizing: border-box;
  }
  .card {
    max-width: 420px;
    width: 100%;
    background: #2b2d31;
    border-left: 4px solid ${accent};
    border-radius: 8px;
    padding: 28px 32px;
    text-align: center;
  }
  h1 { color: #fff; font-size: 1.3rem; margin: 0 0 12px; }
  p { line-height: 1.5; margin: 0; color: #b5bac1; }
  strong { color: #fff; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
