import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility required by the official shadcn/React Flow UI registry components. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
