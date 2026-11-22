export interface CitationParams {
  title: string;
  countryName: string;
  dimensionName?: string;
  url: string;
  accessDate?: Date;
  publicationYear?: number;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}

export function formatABNT(params: CitationParams): string {
  const year = params.publicationYear ?? new Date().getFullYear();
  const date = params.accessDate ?? new Date();
  const months = [
    "jan.", "fev.", "mar.", "abr.", "maio", "jun.",
    "jul.", "ago.", "set.", "out.", "nov.", "dez."
  ];
  const accessStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  const country = (params.countryName || "TellusPedia").toUpperCase();
  
  return `TELLUSPEDIA. ${country}: ${params.title}. TellusPedia: Enciclopédia Geopolítica e Observatório Planetário, ${year}. Disponível em: <${params.url}>. Acesso em: ${accessStr}.`;
}

export function formatAPA(params: CitationParams): string {
  const year = params.publicationYear ?? new Date().getFullYear();
  const date = params.accessDate ?? new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const accessStr = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  const country = params.countryName || "TellusPedia";

  return `TellusPedia. (${year}). ${country}: ${params.title}. In TellusPedia Planetary & Geopolitical Knowledge Base. Retrieved ${accessStr}, from ${params.url}`;
}

export function formatMLA(params: CitationParams): string {
  const year = params.publicationYear ?? new Date().getFullYear();
  const date = params.accessDate ?? new Date();
  const months = [
    "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
    "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
  ];
  const accessStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  const country = params.countryName || "TellusPedia";

  return `"${country}: ${params.title}." TellusPedia: Planetary & Geopolitical Encyclopedia, TellusPedia Foundation, ${year}, ${params.url}. Accessed ${accessStr}.`;
}

export function formatBibTeX(params: CitationParams): string {
  const year = params.publicationYear ?? new Date().getFullYear();
  const date = params.accessDate ?? new Date();
  const country = params.countryName || "telluspedia";
  const citeKey = `telluspedia_${country.toLowerCase().replace(/[^a-z0-9]/g, "")}_${year}`;
  const accessStr = date.toISOString().split("T")[0];

  return `@online{${citeKey},
  author       = {{TellusPedia Editorial Board}},
  title        = {${country}: ${params.title}},
  organization = {TellusPedia: Enciclopédia Geopolítica e Observatório Planetário},
  year         = {${year}},
  url          = {${params.url}},
  urldate      = {${accessStr}}
}`;
}

export { getSourceUrl } from "./source-urls";
