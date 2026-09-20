export const catalogPageSize = 60;
export const maxCatalogPage = 1000;

export function catalogPage(value: number) {
  return Number.isFinite(value)
    ? Math.max(1, Math.min(maxCatalogPage, Math.floor(value)))
    : 1;
}
