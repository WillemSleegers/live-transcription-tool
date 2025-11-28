import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate overall download progress weighted by file size
 * @param fileProgress Map of file names to their download progress (loaded/total bytes)
 * @returns Progress percentage (0-100)
 */
export function calculateWeightedProgress(
  fileProgress: Map<string, { loaded: number; total: number }>
): number {
  const files = Array.from(fileProgress.values());

  if (files.length === 0) {
    return 0;
  }

  const totalBytes = files.reduce((sum, f) => sum + f.total, 0);
  const loadedBytes = files.reduce((sum, f) => sum + f.loaded, 0);

  return totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
}
