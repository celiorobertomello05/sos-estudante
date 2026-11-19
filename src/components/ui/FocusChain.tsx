import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ComponentRef, ReactNode, RefObject } from "react";
import type { TextInput } from "react-native";

type InputInstance = ComponentRef<typeof TextInput>;

interface ChainedField {
  id: string;
  ref: RefObject<InputInstance | null>;
}

interface FocusChain {
  fields: ChainedField[];
  register: (field: ChainedField) => () => void;
}

const FocusChainContext = createContext<FocusChain | null>(null);

/**
 * Liga os campos de uma tela na ordem em que aparecem: a tecla "Próximo" do
 * teclado leva ao campo seguinte e, no último, "Concluir" recolhe o teclado.
 */
export function FocusChainProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<ChainedField[]>([]);
  const register = useCallback((field: ChainedField) => {
    setFields((current) => [...current, field]);
    return () => setFields((current) => current.filter((item) => item.id !== field.id));
  }, []);
  const value = useMemo(() => ({ fields, register }), [fields, register]);
  return <FocusChainContext.Provider value={value}>{children}</FocusChainContext.Provider>;
}

export function useFocusChain() {
  return useContext(FocusChainContext);
}
