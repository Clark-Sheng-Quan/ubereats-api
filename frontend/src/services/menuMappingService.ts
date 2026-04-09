export interface NameEntity {
  id: string;
  name: string;
}

export function normalizeMappingName(value: string): string {
  return String(value || "").trim().toLowerCase();
}

interface VendOption {
  _id: string;
  name: string;
  option_items?: Array<{ _id: string; name: string }>;
}

interface UberOption {
  id: string;
  title?: { translations?: Record<string, string> };
  modifier_options?: Array<{ id: string; type?: string }>;
}

// Helper to extract names for item matching
function getItemNames(items: any[] | undefined): Set<string> {
  return new Set(
    (items || [])
      .map((item) => {
        if (typeof item.name === "string") return normalizeMappingName(item.name);
        if (typeof item.title === "string") return normalizeMappingName(item.title);
        if (item.title?.translations?.en_us) return normalizeMappingName(item.title.translations.en_us);
        return "";
      })
      .filter((name) => name.length > 0)
  );
}

// Helper to get Uber option name
function getUberOptionName(option: UberOption): string {
  const title = option.title?.translations?.en_us || option.title;
  return typeof title === "string" ? title : "";
}

// Advanced option pairing with multi-level matching
export function buildOptionPairs(
  vendOptions: VendOption[],
  uberOptions: UberOption[],
  usedVendIds: Set<string>,
  usedUberIds: Set<string>
): Array<{ leftId: string; rightId: string; name: string }> {
  const pairs: Array<{ leftId: string; rightId: string; name: string }> = [];
  const remainingUber = new Map<string, UberOption>();

  uberOptions.forEach((opt) => {
    if (!usedUberIds.has(opt.id)) {
      remainingUber.set(opt.id, opt);
    }
  });

  vendOptions.forEach((vendOpt) => {
    if (usedVendIds.has(vendOpt._id)) {
      return;
    }

    let matched: UberOption | undefined;

    // Step 1: Try to match by ID
    if (remainingUber.has(vendOpt._id)) {
      matched = remainingUber.get(vendOpt._id);
    }

    // Step 2: Try to match by name
    if (!matched) {
      const vendName = normalizeMappingName(vendOpt.name);
      for (const [, uberOpt] of remainingUber) {
        if (normalizeMappingName(getUberOptionName(uberOpt)) === vendName) {
          matched = uberOpt;
          break;
        }
      }
    }

    // Step 3: If name candidates found, try item count + name matching
    if (!matched) {
      const vendName = normalizeMappingName(vendOpt.name);
      const vendItemCount = vendOpt.option_items?.length || 0;
      const vendItemNames = getItemNames(vendOpt.option_items);

      const nameCandidates: UberOption[] = [];
      for (const [, uberOpt] of remainingUber) {
        if (normalizeMappingName(getUberOptionName(uberOpt)) === vendName) {
          nameCandidates.push(uberOpt);
        }
      }

      // If there are multiple name candidates, use item count to disambiguate
      if (nameCandidates.length > 1) {
        for (const candidate of nameCandidates) {
          const uberItemCount = (candidate.modifier_options || [])
            .filter((opt) => opt.type === "ITEM")
            .length;

          // Try item count match first
          if (uberItemCount === vendItemCount) {
            matched = candidate;
            break;
          }
        }

        // If still no match, try item names matching
        if (!matched && vendItemNames.size > 0) {
          let bestMatch: UberOption | undefined;
          let bestMatchCount = 0;

          for (const candidate of nameCandidates) {
            const uberItemNames = getItemNames(candidate.modifier_options || []);
            const matchCount = Array.from(vendItemNames).filter((name) =>
              uberItemNames.has(name)
            ).length;

            if (matchCount > bestMatchCount) {
              bestMatchCount = matchCount;
              bestMatch = candidate;
            }
          }

          if (bestMatch && bestMatchCount > 0) {
            matched = bestMatch;
          }
        }
      } else if (nameCandidates.length === 1) {
        matched = nameCandidates[0];
      }
      // If name candidates exist but no match found, do not match (wait for manual)
    }

    if (matched) {
      usedVendIds.add(vendOpt._id);
      usedUberIds.add(matched.id);
      remainingUber.delete(matched.id);

      pairs.push({
        leftId: vendOpt._id,
        rightId: matched.id,
        name: vendOpt.name,
      });
    }
  });

  return pairs;
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
