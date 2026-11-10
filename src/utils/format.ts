import { onlyDigits } from "./validation";

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date.getDate()} ${months[date.getMonth()]} · ${time}`;
}

export function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return hours < 48 ? "Ontem" : formatDate(iso);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Mascara contatos para proteger dados pessoais na distribuição. */
export function maskPhone(phone?: string) {
  const digits = onlyDigits(phone ?? "");
  return digits.length >= 2 ? `(**) *****-**${digits.slice(-2)}` : "Protegido";
}

export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskDate(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}

export function maskPhoneInput(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskCep(value: string) {
  return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

/** Identificadores locais (modo demonstração). No Supabase, o banco gera os IDs. */
export function localId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function protocol(prefix: "DOA" | "SOL" | "ENT" | "SUP") {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

/** RG protegido: mostra só os 3 últimos caracteres (formato varia por estado). */
export function maskRg(rg?: string) {
  if (!rg) return "—";
  return rg.length <= 3 ? "***" : `${"*".repeat(rg.length - 3)}${rg.slice(-3)}`;
}
