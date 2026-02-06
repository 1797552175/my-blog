export function excerpt(md, maxLen = 100) {
  if (!md) return '';
  
  let text = String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/^#+\s/gm, ' ')
    .replace(/[*_]{1,3}([^\s][^*_]+[^\s])[*_]{1,3}/g, '$1')
    .replace(/~~([^\s].+?[^\s])~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^>\s/gm, ' ')
    .replace(/^[-*_]{3,}$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}
