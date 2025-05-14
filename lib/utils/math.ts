export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);

  return sum / numbers.length;
}

export function change(current: number, previous: number): number {
  if (previous === 0) return 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100;
}
