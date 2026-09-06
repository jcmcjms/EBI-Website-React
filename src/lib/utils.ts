import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatPHDate = (iso: string) =>
  format(parseISO(iso), "MMMM d, yyyy 'at' h:mm a");
