function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseMarkdown(text) {
  if (!text) return '';
  
  // 1. Escape HTML
  let html = escapeHtml(text);

  // 2. Linkify
  const urlRegex = /((https?:\/\/)?[^\s]+\.(com|net|io|kr|org|co|me|us|한국|google|ai|me|cc|shop|dev|info|page|rest|help|wiki|fyi|sale|army|im)(\/[^\s]*)?)/gi;
  html = html.replace(urlRegex, url => {
    let href = url.startsWith('http') ? url : 'https://' + url;
    return `<a href="${href}" target="_blank" style="color: #3478f6; text-decoration: none;">${url}</a>`;
  });

  // 3. Markdown parsing
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  
  // Underline: __text__
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  
  // H1: # text
  html = html.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; font-weight: bold; margin: 0.5em 0;">$1</h1>');
  
  // H2: ## text
  html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.25em; font-weight: bold; margin: 0.5em 0;">$1</h2>');
  
  // HR: ---
  html = html.replace(/^---$/gm, '<hr style="border: 0; height: 1px; background: #333; margin: 1em 0;">');

  return html;
}
