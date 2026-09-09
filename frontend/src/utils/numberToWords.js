// Indian Numbering System to Words Converter (Crores, Lakhs, Thousands, Hundreds)

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigits(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let str = '';
  if (hundred) str += ONES[hundred] + ' Hundred';
  if (rest) str += (str ? ' ' : '') + convertTwoDigits(rest);
  return str;
}

function numberToWordsChunk(n) {
  if (n < 100) return convertTwoDigits(n);
  return convertThreeDigits(n);
}

/**
 * Converts a number to Indian currency words format.
 * e.g., 14800 -> "Rupees Fourteen Thousand Eight Hundred Only"
 * e.g., 80000 -> "Rupees Eighty Thousand Only"
 * e.g., 100000 -> "Rupees One Lakh Only"
 */
export function numberToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Rupees Zero Only';
  if (n < 0) return 'Minus ' + numberToWords(Math.abs(n));

  let remaining = n;
  const parts = [];

  // Crores (>= 1,00,00,000)
  const crore = Math.floor(remaining / 10000000);
  if (crore) {
    parts.push(numberToWordsChunk(crore) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  const lakh = Math.floor(remaining / 100000);
  if (lakh) {
    parts.push(numberToWordsChunk(lakh) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  const thousand = Math.floor(remaining / 1000);
  if (thousand) {
    parts.push(numberToWordsChunk(thousand) + ' Thousand');
    remaining %= 1000;
  }

  // Hundreds & rest
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  const words = parts.join(' ').trim();
  return `Rupees ${words} Only`;
}

export default numberToWords;
