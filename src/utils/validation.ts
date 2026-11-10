/**
 * Validações de entrada. Todo dado digitado pelo usuário passa por aqui
 * antes de ser enviado ao Supabase.
 */

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Remove espaços extras e limita o tamanho do texto livre. */
export function cleanText(value: string, maxLength = 500) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + Number(cnpj[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

/** Senha forte: 8+ caracteres, letra maiúscula, minúscula e número. */
export function passwordIssue(value: string): string | null {
  if (value.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value)) return "Use letras maiúsculas e minúsculas.";
  if (!/\d/.test(value)) return "Inclua pelo menos um número.";
  return null;
}

/** Aceita DD/MM/AAAA e garante uma data real no passado. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCDate() === d && date.getUTCMonth() === m - 1 && date < new Date() && y > 1900;
  return valid ? date.toISOString().slice(0, 10) : null;
}

export function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function isValidCep(value: string) {
  return onlyDigits(value).length === 8;
}

/** RG: só letras e números (o formato muda por estado), de 5 a 14 caracteres. */
export function normalizeRg(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function isValidRg(value: string) {
  return /^[0-9A-Z]{5,14}$/.test(normalizeRg(value));
}
