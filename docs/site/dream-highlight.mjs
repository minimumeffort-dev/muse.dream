// Source-preserving lexical highlighting. The compiler still owns validation.
export const escapeHtml = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function highlightDream(source, commands) {
  const keywords = new Set(['dream','sin','cos', ...Object.keys(commands)]);
  const tokens = /\/\/[^\r\n]*|"(?:[^"\\\r\n]|\\.)*(?:"|$)|#[\da-fA-F]{6}\b|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|[^A-Za-z_\d]/g;
  return [...source.matchAll(tokens)].map(match => {
    const text = match[0], rest = source.slice(match.index + text.length);
    const kind = text.startsWith('//') ? 'comment' : text.startsWith('"') ? 'string'
      : /^#[\da-fA-F]{6}$/.test(text) ? 'color' : /^(?:\d|\.\d)/.test(text) ? 'number'
      : /^[A-Za-z_]/.test(text) && /^\s*=/.test(rest) ? 'field' : keywords.has(text) ? 'keyword'
      : /^(true|false)$/.test(text) ? 'boolean' : /^[A-Za-z_]/.test(text) ? 'symbol' : '';
    return kind ? `<span class="dream-${kind}">${escapeHtml(text)}</span>` : escapeHtml(text);
  }).join('');
}
