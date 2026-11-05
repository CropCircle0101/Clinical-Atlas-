export function validNpi(value: string) {
  if (!/^\d{10}$/.test(value)) return false;
  const digits = `80840${value}`.split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1, offset = 0; i >= 0; i--, offset++) {
    let n = digits[i];
    if (offset % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
