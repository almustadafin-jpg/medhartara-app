import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung className bersyarat + selesaikan konflik utility Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
