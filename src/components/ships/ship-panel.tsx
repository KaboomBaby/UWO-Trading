import type { ShipDetails } from "../../types/listing";
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

export function ShipPanel({ details }: { details: ShipDetails }) {
  return (
    <section
      aria-label="Ship specifications"
      className="rounded-2xl border border-amber-glow/25 bg-ink/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <ShipTypeIcon type={details.type} className="h-16 w-16" />
        <div>
          <h2 className="text-xl font-semibold text-white">
            {formatShipType(details.type)} ·{" "}
            {formatShipClass(details.shipClass)}
          </h2>
          <p className="mt-1 text-slate-300">
            Grade {details.grade} ({details.role})
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
        <section aria-label="Ship performance">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
            Ship performance
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCell
              icon="verticalSail"
              label="Vertical sail"
              value={details.performance.verticalSail}
            />
            <StatCell
              icon="horizontalSail"
              label="Horizontal sail"
              value={details.performance.horizontalSail}
            />
            <StatCell
              icon="rowPower"
              label="Row power"
              value={details.performance.rowPower}
            />
            <StatCell
              icon="turnSpeed"
              label="Turn speed"
              value={details.performance.turnSpeed}
            />
            <StatCell
              icon="waveResistance"
              label="Wave resistance"
              value={details.performance.waveResistance}
            />
            <StatCell
              icon="armour"
              label="Armour"
              value={details.performance.armour}
            />
          </div>
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
        </section>
        <StatCell icon="armour" label="Durability" value={details.durability} />
      </div>

      <section aria-label="Ship hold" className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
          Ship hold
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCell icon="crew" label="Crew" value={details.hold.crew} />
          <StatCell
            icon="cannons"
            label="Cannons"
            value={details.hold.cannons}
          />
          <StatCell icon="cargo" label="Cargo" value={details.hold.cargo} />
          <StatCell
            icon="sailors"
            label="Sailors required"
            value={details.hold.sailorsRequired}
          />
        </div>
      </section>

      <section aria-label="Sailing requirements" className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
          Sailing requirements
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCell
            icon="adventure"
            label="Adventure Lv"
            value={details.sailingRequirements.adventureLevel}
          />
          <StatCell
            icon="trade"
            label="Trade Lv"
            value={details.sailingRequirements.tradeLevel}
          />
          <StatCell
            icon="battle"
            label="Battle Lv"
            value={details.sailingRequirements.battleLevel}
          />
        </div>
      </section>

      <dl className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Req. building days</dt>
          <dd className="font-semibold text-white">{details.buildingDays}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Required hull</dt>
          <dd className="text-right font-semibold text-white">
            {details.requiredHull}
          </dd>
        </div>
      </dl>
    </section>
  );
}
