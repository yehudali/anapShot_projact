export function timeAgo(timestamp) {
  if (!timestamp) return '—';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'עכשיו';
  if (seconds < 60) return `לפני ${seconds}ש`;
  if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)}ד`;
  return `לפני ${Math.floor(seconds / 3600)}ש׳`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('he-IL');
}
