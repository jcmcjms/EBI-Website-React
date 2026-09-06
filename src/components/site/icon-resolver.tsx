import {
  ArrowRight,
  Bank,
  Buildings,
  Calculator,
  Certificate,
  ChartLineUp,
  Coin,
  CreditCard,
  DeviceMobile,
  GraduationCap,
  HandCoins,
  Handshake,
  Headset,
  House,
  Lock,
  MapPin,
  PiggyBank,
  Receipt,
  ShieldCheck,
  SignIn,
  Student,
  UserPlus,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Phosphor icon name → component resolver.
 *
 * CMS editors pass a plain string ("Buildings", "Calculator", …) in
 * the `quickLinks[].icon` and `whyUs[].reasons[].icon` fields. This
 * map turns that string into a real component for the renderer.
 *
 * Unknown names fall back to `Buildings` — a bank-themed icon that
 * reads as "institution / branch" for any financial site.
 *
 * Note: we DO NOT pre-build a component map (e.g. `Record<string,
 * Component>`) — the React Compiler treats any reassignment to a
 * component-shaped const inside render as "component created during
 * render" and rejects it. Instead `IconByName` switches on the name
 * and renders the matching import directly.
 */

export type PhosphorIconName =
  | "ArrowRight"
  | "Bank"
  | "Buildings"
  | "Calculator"
  | "Certificate"
  | "ChartLineUp"
  | "Coin"
  | "CreditCard"
  | "DeviceMobile"
  | "GraduationCap"
  | "HandCoins"
  | "Handshake"
  | "Headset"
  | "House"
  | "Lock"
  | "MapPin"
  | "PiggyBank"
  | "Receipt"
  | "ShieldCheck"
  | "SignIn"
  | "Student"
  | "UserPlus"
  | "Wallet";

export type PhosphorWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone";

export interface IconByNameProps {
  /** CMS-supplied icon name. Unknown values fall back to `Buildings`. */
  name?: string | null | undefined;
  /** Pixel size (Phosphor accepts a number). Default 24. */
  size?: number;
  /** Phosphor weight. Default `regular`. */
  weight?: PhosphorWeight;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  alt?: string;
}

/**
 * Render an icon given a CMS-supplied name. Convenience wrapper so
 * renderers don't have to import + re-export every icon component.
 */
export function IconByName({
  name,
  size = 24,
  weight = "regular",
  className,
  "aria-hidden": ariaHidden,
  alt,
}: IconByNameProps) {
  const common = {
    size,
    weight,
    className,
    "aria-hidden": ariaHidden,
    alt,
  } as const;

  switch (name) {
    case "ArrowRight":    return <ArrowRight {...common} />;
    case "Bank":          return <Bank {...common} />;
    case "Calculator":    return <Calculator {...common} />;
    case "Certificate":   return <Certificate {...common} />;
    case "ChartLineUp":   return <ChartLineUp {...common} />;
    case "Coin":          return <Coin {...common} />;
    case "CreditCard":    return <CreditCard {...common} />;
    case "DeviceMobile":  return <DeviceMobile {...common} />;
    case "GraduationCap": return <GraduationCap {...common} />;
    case "HandCoins":     return <HandCoins {...common} />;
    case "Handshake":     return <Handshake {...common} />;
    case "Headset":       return <Headset {...common} />;
    case "House":         return <House {...common} />;
    case "Lock":          return <Lock {...common} />;
    case "MapPin":        return <MapPin {...common} />;
    case "PiggyBank":     return <PiggyBank {...common} />;
    case "Receipt":       return <Receipt {...common} />;
    case "ShieldCheck":   return <ShieldCheck {...common} />;
    case "SignIn":        return <SignIn {...common} />;
    case "Student":       return <Student {...common} />;
    case "UserPlus":      return <UserPlus {...common} />;
    case "Wallet":        return <Wallet {...common} />;
    case "Buildings":
    default:
      return <Buildings {...common} />;
  }
}
