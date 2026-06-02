import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a ticket number as #1234. */
export function ticketRef(number: number) {
  return `#${number}`;
}
