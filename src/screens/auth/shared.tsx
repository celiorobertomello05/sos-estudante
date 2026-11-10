import type { UserRole } from "../../domain/models";

export const CONFIGURATION_ERROR =
  "O Supabase não está configurado e o modo demonstração está desativado. Configure as variáveis públicas do Supabase ou habilite explicitamente a demonstração.";

export const roles: UserRole[] = ["student", "donor", "collector"];
