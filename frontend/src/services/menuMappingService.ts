export interface NameEntity {
  id: string;
  name: string;
}

export function normalizeMappingName(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export function buildExactNamePairs(
  left: NameEntity[],
  right: NameEntity[],
  usedLeftIds: Set<string>,
  usedRightIds: Set<string>
): Array<{ leftId: string; rightId: string; name: string }> {
  const availableRightByName = new Map<string, NameEntity[]>();

  right.forEach((entity) => {
    if (usedRightIds.has(entity.id)) {
      return;
    }

    const key = normalizeMappingName(entity.name);
    if (!key) {
      return;
    }

    const existing = availableRightByName.get(key) || [];
    existing.push(entity);
    availableRightByName.set(key, existing);
  });

  const pairs: Array<{ leftId: string; rightId: string; name: string }> = [];

  left.forEach((entity) => {
    if (usedLeftIds.has(entity.id)) {
      return;
    }

    const key = normalizeMappingName(entity.name);
    if (!key) {
      return;
    }

    const candidates = availableRightByName.get(key);
    if (!candidates || candidates.length === 0) {
      return;
    }

    const matched = candidates.shift();
    if (!matched) {
      return;
    }

    usedLeftIds.add(entity.id);
    usedRightIds.add(matched.id);

    pairs.push({
      leftId: entity.id,
      rightId: matched.id,
      name: entity.name,
    });
  });

  return pairs;
}
