// ESLint: regras recomendadas do Expo para o app.
// Edge functions (Deno) e os testes Node ficam de fora.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "supabase/functions/**", "tests/**"],
  },
  {
    rules: {
      // Padrões nativos do React Native (useRef(new Animated.Value()).current,
      // PanResponder em SignaturePad) são marcados por esta regra do React
      // Compiler. Reescrevê-los exige teste em aparelho; fica como aviso.
      "react-hooks/refs": "warn",
    },
  },
]);
