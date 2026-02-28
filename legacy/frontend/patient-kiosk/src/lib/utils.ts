import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes with clsx — standard shadcn/ui pattern */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
