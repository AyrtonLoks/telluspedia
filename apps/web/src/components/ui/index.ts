// Primitivos do design system (D14). Componentes novos devem usar estes blocos e os tokens
// de src/styles/globals.css + tailwind.config.ts — ver AGENTS.md, seção 5.
// Em componentes do app (bundle da página inicial), prefira importar o arquivo direto
// (ex.: "@/components/ui/Button"): o barrel puxa Radix Dialog/Tooltip/Tabs para o bundle.
export { cn } from "./cn";
export { TONES, CATEGORY_TONE, CATEGORY_LABEL, type Tone, type ToneClasses } from "./tones";
export { Button, buttonClasses, type ButtonProps, type ButtonVariant, type ButtonSize } from "./Button";
export { IconButton, type IconButtonProps } from "./IconButton";
export { Switch, type SwitchProps } from "./Switch";
export { Chip, type ChipProps } from "./Chip";
export { Badge, type BadgeProps } from "./Badge";
export { Stat, type StatProps } from "./Stat";
export { Panel, PanelHeader, PanelBody, PanelFooter, type PanelHeaderProps } from "./Panel";
export { Card, type CardProps } from "./Card";
export { Tooltip, type TooltipProps } from "./Tooltip";
export { Dialog, DialogTrigger, DialogClose, DialogContent, type DialogContentProps } from "./Dialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
