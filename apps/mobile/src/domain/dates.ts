export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLongDate(date: Date, language: 'en' | 'zh-Hans'): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function isPastDate(dateKey: string | null, today = localDateKey()): boolean {
  return dateKey != null && dateKey < today;
}

