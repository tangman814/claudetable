type ClassValue = string | undefined | null | false | Record<string, boolean>;

export function cn(...args: ClassValue[]): string {
  return args
    .flatMap((arg) => {
      if (!arg) return [];
      if (typeof arg === "string") return [arg];
      return Object.entries(arg)
        .filter(([, v]) => v)
        .map(([k]) => k);
    })
    .join(" ");
}
