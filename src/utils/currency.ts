const USD_TO_INR_RATE = 83;

export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  const inrAmount = amount * USD_TO_INR_RATE;
  const formatted = inrAmount.toLocaleString('en-IN');
  return showSymbol ? `₹${formatted}` : formatted;
}

export function formatCurrencyCompact(amount: number): string {
  const inrAmount = amount * USD_TO_INR_RATE;

  if (inrAmount >= 10000000) {
    return `₹${(inrAmount / 10000000).toFixed(1)}Cr`;
  } else if (inrAmount >= 100000) {
    return `₹${(inrAmount / 100000).toFixed(1)}L`;
  } else if (inrAmount >= 1000) {
    return `₹${(inrAmount / 1000).toFixed(0)}K`;
  }

  return `₹${inrAmount.toLocaleString('en-IN')}`;
}
