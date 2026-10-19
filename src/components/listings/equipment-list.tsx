import { useState } from "react";
import { Link } from "react-router-dom";

import { formatDurability, formatWearer } from "../equipment/equipment-panel";
import { equipmentSkillIconUrl } from "../../data/equipment-skills";
import { formatListingPrice, type Listing } from "../../types/listing";
import { NameTooltip, useNameTooltip } from "./name-tooltip";

const chipClassName =
  "relative flex min-w-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1";

const chipHandlers = (tooltip: ReturnType<typeof useNameTooltip>) => ({
  onBlur: tooltip.hide,
  onContextMenu: tooltip.showFromContextMenu,
  onFocus: tooltip.show,
  onMouseEnter: tooltip.show,
  onMouseLeave: tooltip.hide,
  onPointerCancel: tooltip.endLongPress,
  onPointerDown: tooltip.startLongPress,
  onPointerLeave: tooltip.endLongPress,
  onPointerUp: tooltip.endLongPress,
});

function EquipmentStatChip({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const tooltip = useNameTooltip();
  return (
    <li
      aria-label={`${label}: ${value}`}
      className={chipClassName}
      tabIndex={0}
      {...chipHandlers(tooltip)}
    >
      <img alt="" className="h-6 w-6 object-contain" src={icon} />
      <span className="font-semibold tabular-nums">{value}</span>
      {tooltip.isTooltipVisible ? <NameTooltip name={label} /> : null}
    </li>
  );
}

function EquipmentSkillChip({
  iconId,
  name,
  value,
}: {
  iconId: string;
  name: string;
  value: number;
}) {
  const tooltip = useNameTooltip();
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <li
      aria-label={`${name}: +${value}`}
      className={chipClassName}
      tabIndex={0}
      {...chipHandlers(tooltip)}
    >
      {iconFailed ? null : (
        <img
          alt=""
          className="h-6 w-6 object-contain"
          onError={() => setIconFailed(true)}
          src={equipmentSkillIconUrl(iconId)}
        />
      )}
      <span className="font-semibold tabular-nums">
        {iconFailed ? `${name} +${value}` : `+${value}`}
      </span>
      {tooltip.isTooltipVisible ? <NameTooltip name={name} /> : null}
    </li>
  );
}

export function EquipmentList({ listings }: { listings: Listing[] }) {
  return (
    <section aria-label="Equipment listings">
      <ul className="grid gap-3">
        {listings.map((listing) => {
          const details = listing.equipmentDetails;
          const durability = details ? formatDurability(details) : null;
          const stats: Array<{ icon: string; label: string; value: string }> =
            [];
          if (details && durability) {
            stats.push({
              icon: "/equipment-stat-icons/durability.png",
              label: "Durability",
              value: durability,
            });
          }
          if (details?.formality !== undefined) {
            stats.push({
              icon: "/equipment-stat-icons/formality.png",
              label: "Formality",
              value: String(details.formality),
            });
          }
          if (details?.disguiseLevel !== undefined) {
            stats.push({
              icon: "/equipment-stat-icons/disguise.png",
              label: "Disguise Level",
              value: String(details.disguiseLevel),
            });
          }
          if (details?.attackPower !== undefined) {
            stats.push({
              icon: "/equipment-stat-icons/attack.png",
              label: "Attack Power",
              value: String(details.attackPower),
            });
          }
          if (details?.defencePower !== undefined) {
            stats.push({
              icon: "/equipment-stat-icons/defence.png",
              label: "Defence Power",
              value: String(details.defencePower),
            });
          }
          const skillBonuses = details?.skillBonuses ?? [];
          const textParts: string[] = [];
          if (details?.weaponCategory) textParts.push(details.weaponCategory);
          const effects = details?.effects ?? [];
          const extraLines = details?.extraLines ?? [];
          return (
            <li key={listing.id}>
              <Link
                className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-amber-glow/70 hover:bg-white/10 sm:p-5"
                to={`/listings/${listing.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {listing.title}
                    {details?.wearer ? (
                      <span className="ml-2 text-sm font-medium text-slate-300">
                        {formatWearer(details.wearer)}
                      </span>
                    ) : null}
                  </h3>
                  <span className="flex flex-wrap items-center gap-2">
                    {listing.soldAt ? (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100">
                        SOLD
                      </span>
                    ) : null}
                    <span className="text-lg font-semibold text-amber-glow">
                      {formatListingPrice(listing.price, listing.currency)}
                    </span>
                  </span>
                </div>
                {stats.length > 0 || skillBonuses.length > 0 ? (
                  <ul
                    aria-label="Equipment specifications and skills"
                    className="flex flex-wrap gap-1.5 text-[0.7rem] text-slate-200"
                  >
                    {stats.map((stat) => (
                      <EquipmentStatChip
                        icon={stat.icon}
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                      />
                    ))}
                    {skillBonuses.map((bonus) => (
                      <EquipmentSkillChip
                        iconId={bonus.iconId}
                        key={bonus.iconId}
                        name={bonus.name}
                        value={bonus.value}
                      />
                    ))}
                  </ul>
                ) : null}
                {effects.length > 0 ? (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200">
                    <img
                      alt=""
                      className="h-5 w-5 object-contain"
                      src="/equipment-stat-icons/effect.png"
                    />
                    {effects
                      .map((effect) =>
                        effect.rank !== undefined
                          ? `${effect.name} Rank ${effect.rank}`
                          : effect.name,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
                {textParts.length > 0 || extraLines.length > 0 ? (
                  <p className="text-sm leading-relaxed text-slate-200">
                    {[
                      ...textParts,
                      ...extraLines.map((line) =>
                        line.value !== undefined
                          ? `${line.label} ${line.value}`
                          : line.label,
                      ),
                    ].join(" · ")}
                  </p>
                ) : null}
                <p className="text-sm text-slate-400">
                  Seller: {listing.seller} · Location: {listing.location}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
