import type { Source, Provider, Contract } from "./types";
export function selectSources(
  sources: Source[],
  providers: Provider[],
  contracts: Contract[],
): Source[] {
  const eligible = sources.filter(
    (s) =>
      s.isActive &&
      !s.manuallyDisabled &&
      providers.some((p) => p.id === s.providerId && p.enabled) &&
      contracts.some((c) => c.providerId === s.providerId && c.enabled),
  );
  const exclusive = new Set(
    contracts
      .filter(
        (c) =>
          c.enabled &&
          c.exclusivity === "exclusive" &&
          eligible.some((s) => s.providerId === c.providerId),
      )
      .map((c) => c.providerId),
  );
  // Conflicting exclusive contracts require operator review. Fail closed.
  if (exclusive.size > 1) return [];
  return eligible
    .filter((s) => !exclusive.size || exclusive.has(s.providerId))
    .sort(
      (a, b) =>
        (b.manualPriority ?? -1) - (a.manualPriority ?? -1) ||
        (providers.find((p) => p.id === b.providerId)?.priority ?? 0) -
          (providers.find((p) => p.id === a.providerId)?.priority ?? 0) ||
        b.providerRank - a.providerRank ||
        b.priority - a.priority ||
        a.id.localeCompare(b.id),
    );
}
