import type { ShipDetails } from "../../types/listing";
import { shipSkillIconUrl } from "../../data/ship-skills";
import {
  ShipStatIcon,
  ShipTypeIcon,
  formatShipClass,
  formatShipType,
} from "./ship-visuals";

function StatCell({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof ShipStatIcon>[0]["name"];
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <ShipStatIcon name={icon} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SkillBadge({
  isOriginal,
  name,
  iconId,
}: {
  isOriginal?: boolean;
  name: string;
  iconId: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <img
        alt=""
        className="h-10 w-10 rounded-md border border-white/15 bg-black/30 object-contain"
        src={shipSkillIconUrl(iconId)}
      />
      <div>
        <p className="font-semibold text-white">{name}</p>
        <p className="text-xs uppercase tracking-wide text-amber-glow">
          {isOriginal ? "Original" : "Optional"}
        </p>
      </div>
    </li>
  );
}

type PanelStat = {
  icon: Parameters<typeof ShipStatIcon>[0]["name"];
  label: string;
  value?: number;
};

function presentStats(stats: PanelStat[]) {
  return stats.filter(
    (stat): stat is PanelStat & { value: number } => stat.value !== undefined,
  );
}

export function ShipPanel({ details }: { details: ShipDetails }) {
  const performanceStats = presentStats([
    {
      icon: "verticalSail",
      label: "Vertical sail",
      value: details.performance?.verticalSail,
    },
    {
      icon: "horizontalSail",
      label: "Horizontal sail",
      value: details.performance?.horizontalSail,
    },
    {
      icon: "rowPower",
      label: "Row power",
      value: details.performance?.rowPower,
    },
    {
      icon: "turnSpeed",
      label: "Turn speed",
      value: details.performance?.turnSpeed,
    },
    {
      icon: "waveResistance",
      label: "Wave resistance",
      value: details.performance?.waveResistance,
    },
    { icon: "armour", label: "Armour", value: details.performance?.armour },
  ]);
  const holdStats = presentStats([
    { icon: "crew", label: "Crew", value: details.hold?.crew },
    { icon: "cannons", label: "Cannons", value: details.hold?.cannons },
    { icon: "cargo", label: "Cargo", value: details.hold?.cargo },
    {
      icon: "sailors",
      label: "Sailors required",
      value: details.hold?.sailorsRequired,
    },
  ]);
  const requirementStats = presentStats([
    {
      icon: "adventure",
      label: "Adventure Lv",
      value: details.sailingRequirements?.adventureLevel,
    },
    {
      icon: "trade",
      label: "Trade Lv",
      value: details.sailingRequirements?.tradeLevel,
    },
    {
      icon: "battle",
      label: "Battle Lv",
      value: details.sailingRequirements?.battleLevel,
    },
  ]);
  const optionalSkills = details.optionalSkills ?? [];
  const gradeLine = [
    details.grade !== undefined ? `Grade ${details.grade}` : null,
    details.role ? `(${details.role})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const showPerformanceBlock =
    performanceStats.length > 0 ||
    details.improvements !== undefined ||
    details.durability !== undefined;

  return (
    <section
      aria-label="Ship specifications"
      className="rounded-2xl border border-amber-glow/25 bg-ink/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <ShipTypeIcon type={details.type} className="h-16 w-16" />
        <div>
          <h2 className="text-xl font-semibold text-white">
            {formatShipType(details.type)}
            {details.shipClass
              ? ` · ${formatShipClass(details.shipClass)}`
              : ""}
          </h2>
          {gradeLine ? (
            <p className="mt-1 text-slate-300">{gradeLine}</p>
          ) : null}
        </div>
      </div>

      {showPerformanceBlock ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
          <section aria-label="Ship performance">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
              Ship performance
            </h3>
            {performanceStats.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {performanceStats.map((stat) => (
                  <StatCell
                    icon={stat.icon}
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                  />
                ))}
              </div>
            ) : null}
            {details.improvements !== undefined ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <ShipStatIcon name="improvements" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Improvements
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {details.improvements} / 5
                  </p>
                </div>
              </div>
            ) : null}
          </section>
          {details.durability !== undefined ? (
            <StatCell
              icon="armour"
              label="Durability"
              value={details.durability}
            />
          ) : null}
        </div>
      ) : null}

      {holdStats.length > 0 ? (
        <section aria-label="Ship hold" className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
            Ship hold
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {holdStats.map((stat) => (
              <StatCell
                icon={stat.icon}
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </section>
      ) : null}

      {requirementStats.length > 0 ? (
        <section aria-label="Sailing requirements" className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
            Sailing requirements
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {requirementStats.map((stat) => (
              <StatCell
                icon={stat.icon}
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Ship skills" className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
          Ship skills
        </h3>
        {details.originalSkill || optionalSkills.length > 0 ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {details.originalSkill ? (
              <SkillBadge
                iconId={details.originalSkill.iconId}
                isOriginal
                name={details.originalSkill.name}
              />
            ) : null}
            {optionalSkills.map((skill) => (
              <SkillBadge
                iconId={skill.iconId}
                key={skill.iconId}
                name={skill.name}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-300">
            No ship skills selected.
          </p>
        )}
      </section>
    </section>
  );
}
