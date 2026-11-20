import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge com os tokens do D14. Sem isto, `text-caption` (tamanho) e `text-fg` (cor)
 * seriam tratados como a mesma classe de cor e um deles seria descartado no merge.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "label", "body", "title", "display"] }],
      rounded: [{ rounded: ["control", "card", "panel"] }],
      shadow: [{ shadow: ["e1", "e2"] }],
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
