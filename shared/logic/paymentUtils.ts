export function calculateDownPayment(totalCost: number): number {
  return totalCost * 0.5;
}

export function calculateBalance(totalCost: number, downPayment: number): number {
  return totalCost - downPayment;
}

export function validateDownPayment(totalCost: number, downPayment: number): boolean {
  const expectedDownPayment = calculateDownPayment(totalCost);
  return Math.abs(downPayment - expectedDownPayment) < 0.01;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
