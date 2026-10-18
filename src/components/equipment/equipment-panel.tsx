import { getEquipmentSkill } from "../../data/equipment-skills";
import type { EquipmentDetails, EquipmentWearer } from "../../types/listing";

export function formatWearer(wearer: EquipmentWearer): string {
  if (wearer === "male") return "♂ Male";
  if (wearer === "female") return "♀ Female";
  return "Unisex";
}

export function wearerSymbol(wearer: EquipmentWearer): string {
  if (wearer === "male") return "♂";
  if (wearer === "female") return "♀";
  return "♂♀";
}

const familyLabels = {
  adventure: "Adventure",
  trade: "Trade",
  battle: "Battle",
} as const;

export function formatDurability(details: EquipmentDetails): string | null {
  if (
    details.durabilityCurrent !== undefined &&
    details.durabilityMax !== undefined
  ) {
    return `${details.durabilityCurrent}/${details.durabilityMax}`;
  }
  if (details.durabilityCurrent !== undefined)
    return String(details.durabilityCurrent);
  if (details.durabilityMax !== undefined) return String(details.durabilityMax);
  return null;
}

/** Ordered one-line summary parts, in the game's tooltip order. */
export function equipmentSummaryParts(details: EquipmentDetails): string[] {
  const parts: string[] = [];
  const durability = formatDurability(details);
  if (durability) parts.push(`Durability ${durability}`);
  if (details.formality !== undefined)
    parts.push(`Formality ${details.formality}`);
  if (details.disguiseLevel !== undefined)
    parts.push(`Disguise Level ${details.disguiseLevel}`);
  if (details.attackPower !== undefined)
    parts.push(`Attack Power ${details.attackPower}`);
  if (details.defencePower !== undefined)
    parts.push(`Defence Power ${details.defencePower}`);
  for (const bonus of details.skillBonuses ?? []) {
    parts.push(`${bonus.name} +${bonus.value}`);
  }
  if (details.weaponCategory) parts.push(details.weaponCategory);
  for (const effect of details.effects ?? []) {
    parts.push(
      effect.rank !== undefined
        ? `${effect.name} Rank ${effect.rank}`
        : effect.name,
    );
  }
  for (const line of details.extraLines ?? []) {
    parts.push(
      line.value !== undefined ? `${line.label} ${line.value}` : line.label,
    );
  }
  return parts;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function EquipmentPanel({ details }: { details: EquipmentDetails }) {
  const durability = formatDurability(details);
  const stats: Array<{ label: string; value?: string | number }> = [
    { label: "Durability", value: durability ?? undefined },
    { label: "Formality", value: details.formality },
    { label: "Disguise Level", value: details.disguiseLevel },
    { label: "Attack Power", value: details.attackPower },
    { label: "Defence Power", value: details.defencePower },
  ];
  const presentStats = stats.filter(
    (stat): stat is { label: string; value: string | number } =>
      stat.value !== undefined,
  );
  const skillBonuses = details.skillBonuses ?? [];
  const effects = details.effects ?? [];
  const extraLines = details.extraLines ?? [];

  return (
    <section
      aria-label="Equipment specifications"
      className="rounded-2xl border border-amber-glow/25 bg-ink/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        {details.wearer ? (
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-3xl text-amber-glow"
          >
            {wearerSymbol(details.wearer)}
          </span>
        ) : null}
        <div>
          <h2 className="text-xl font-semibold text-white">
            {details.weaponCategory
              ? `Weapon Category: ${details.weaponCategory}`
              : "Equipment"}
          </h2>
          {details.wearer ? (
            <p className="mt-1 text-slate-300">
              Worn by: {formatWearer(details.wearer)}
            </p>
          ) : null}
        </div>
      </div>

      {presentStats.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {presentStats.map((stat) => (
            <StatCell key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      ) : null}

      {skillBonuses.length > 0 ? (
        <section aria-label="Skill bonuses" className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
            Skill bonuses
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {skillBonuses.map((bonus) => {
              const record = getEquipmentSkill(bonus.iconId);
              return (
                <li
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                  key={bonus.iconId}
                >
                  <div>
                    <p className="font-semibold text-white">{bonus.name}</p>
                    {record ? (
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {familyLabels[record.family]}
                      </p>
                    ) : null}
                  </div>
                  <span className="ml-auto text-lg font-semibold text-amber-glow">
                    +{bonus.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {effects.length > 0 ? (
        <section aria-label="Equipment Effects" className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
            Equipment Effects
          </h3>
          <ul className="mt-3 grid gap-3">
            {effects.map((effect, index) => (
              <li
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                key={`${effect.name}-${index}`}
              >
                <p className="font-semibold text-white">{effect.name}</p>
                {effect.rank !== undefined ? (
                  <span className="ml-auto text-sm font-semibold text-amber-glow">
                    Rank {effect.rank}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {extraLines.length > 0 ? (
        <section aria-label="Extra lines" className="mt-5">
          <ul className="grid gap-2">
            {extraLines.map((line, index) => (
              <li
                className="flex items-center gap-3 text-sm text-slate-200"
                key={`${line.label}-${index}`}
              >
                <span>{line.label}</span>
                {line.value !== undefined ? (
                  <span className="font-semibold text-white">{line.value}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
