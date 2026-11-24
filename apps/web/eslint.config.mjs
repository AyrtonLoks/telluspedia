import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega FlatCompat a partir da árvore já instalada pelo `eslint-config-next` (sem pacote extra).
const requireFromHere = createRequire(import.meta.url);
const requireFromNextConfig = createRequire(requireFromHere.resolve("eslint-config-next"));
const { FlatCompat } = requireFromNextConfig("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "out/**",
      "playwright-report/**",
      "test-results/**",
      "public/basis/**",
      "src/lib/tellus-bridge/contract/*.d.mts",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      // Arquivos .ts sem JSX precisam passar `children` no objeto de props em React.createElement (React 19 types)
      "react/no-children-prop": "off",
    },
  },
];

export default eslintConfig;
