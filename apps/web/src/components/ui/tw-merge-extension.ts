/**
 * Tokens do D14 que o tailwind-merge precisa conhecer. Sem isto, `text-caption` (tamanho) e
 * `text-fg` (cor) seriam tratados como a mesma classe de cor e um deles seria descartado.
 * Usado pelo gerador da tabela do `cn` e pelos testes (T35).
 */
export const TW_MERGE_EXTENSION = {
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "label", "body", "title", "display"] }],
      rounded: [{ rounded: ["control", "card", "panel"] }],
      shadow: [{ shadow: ["e1", "e2"] }],
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
};
