export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatPricingLabel(period: 'HOUR' | 'DAY' | 'WEEK', duration: number): string {
  const map = { HOUR: 'Hour', DAY: 'Day', WEEK: 'Week' };
  return `${duration} ${map[period]}${duration > 1 ? 's' : ''}`;
}

export function getPricingStartingPrice(pricing: { price: number }[]): number {
  if (!pricing.length) return 0;
  return Math.min(...pricing.map(p => p.price));
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
