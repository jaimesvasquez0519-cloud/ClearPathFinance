/**
 * Utility to parse bank SMS messages into structured transaction data.
 * Focuses on common Colombian banks: Bancolombia, Nequi, BBVA, etc.
 */

interface ParsedSMS {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date?: Date;
}

export const parseBankSMS = (text: string): ParsedSMS | null => {
  if (!text) return null;

  let amount = 0;
  let description = 'Gasto detectado';
  let type: 'income' | 'expense' = 'expense';

  // 1. Extract Amount
  // Matches "$ 50.000", "$50.000", "COP 50.000,00", etc.
  const amountRegex = /(?:\$|COP)\s?([\d.,]+)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    // Clean amount: remove dots, change comma to dot, etc.
    const rawAmount = amountMatch[1];
    // Colombian format usually uses . as thousands separator and , as decimal
    // We remove . and replace , with .
    amount = parseFloat(rawAmount.replace(/\./g, '').replace(/,/g, '.'));
  }

  // 2. Identify Type (Income vs Expense)
  const incomeKeywords = ['abono', 'recibido', 'ingreso', 'transferencia recibida', 'reversa'];
  const expenseKeywords = ['compra', 'retiro', 'pago', 'transferencia enviada', 'debito'];

  const lowerText = text.toLowerCase();
  if (incomeKeywords.some(kw => lowerText.includes(kw))) {
    type = 'income';
    description = 'Ingreso detectado';
  } else if (expenseKeywords.some(kw => lowerText.includes(kw))) {
    type = 'expense';
    description = 'Gasto detectado';
  }

  // 3. Extract Description (Try to find "en [Lugar]" or "a [Nombre]")
  const merchantRegex = /(?:en|comercio|a|pago a)\s+([A-Z0-9\s._-]+?)(?:\s+\d{2}\/\d{2}|\s+\d{2}:\d{2}|\s+\.|$)/i;
  const merchantMatch = text.match(merchantRegex);
  if (merchantMatch) {
    description = merchantMatch[1].trim();
  } else {
    // Fallback search for common nouns after "en"
    const fallbackRegex = /en\s+([a-zA-Z0-9]+)/i;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch) description = fallbackMatch[1].trim();
  }

  if (amount === 0) return null;

  return { amount, description, type };
};
