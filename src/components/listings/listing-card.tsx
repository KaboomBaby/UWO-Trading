import { Link } from "react-router-dom";

import { shipSkillIconUrl } from "../../data/ship-skills";
import { NameTooltip, useNameTooltip } from "./name-tooltip";
import { formatDurability } from "../equipment/equipment-panel";
import type {
  EquipmentDetails,
  ShipDetails,
  ShipSkill,
} from "../../types/listing";
import type { Listing } from "../../types/listing";
import { formatListingPrice } from "../../types/listing";
import {
  ShipStatImage,
  ShipTypeArt,
  formatShipClass,
  formatShipType,
} from "../ships/ship-visuals";

type CompactShipStat = {
  label: string;
  name: Parameters<typeof ShipStatImage>[0]["name"];
  value: string | number;
};

function getCompactShipStats(details: ShipDetails): CompactShipStat[] {
  const candidates: Array<{
    label: string;
    name: CompactShipStat["name"];
    value?: string | number;
  }> = [
    {
      label: "Vertical sail",
      name: "verticalSail",
      value: details.performance?.verticalSail,
    },
    {
      label: "Horizontal sail",
      name: "horizontalSail",
      value: details.performance?.horizontalSail,
    },
    {
      label: "Row power",
      name: "rowPower",
      value: details.performance?.rowPower,
    },
    {
      label: "Turn speed",
      name: "turnSpeed",
      value: details.performance?.turnSpeed,
    },
    {
      label: "Wave resistance",
      name: "waveResistance",
      value: details.performance?.waveResistance,
    },
    { label: "Armour", name: "armour", value: details.performance?.armour },
    { label: "Durability", name: "durability", value: details.durability },
    {
      label: "Improvements",
      name: "improvements",
      value:
        details.improvements !== undefined
          ? `${details.improvements} / 5`
          : undefined,
    },
    { label: "Crew", name: "crew", value: details.hold?.crew },
    { label: "Cannons", name: "cannons", value: details.hold?.cannons },
    { label: "Cargo", name: "cargo", value: details.hold?.cargo },
    {
      label: "Sailors required",
      name: "sailors",
      value: details.hold?.sailorsRequired,
    },
    {
      label: "Adventure Lv",
      name: "adventure",
      value: details.sailingRequirements?.adventureLevel,
    },
    {
      label: "Trade Lv",
      name: "trade",
      value: details.sailingRequirements?.tradeLevel,
    },
    {
      label: "Battle Lv",
      name: "battle",
      value: details.sailingRequirements?.battleLevel,
    },
  ];

  return candidates.filter(
    (stat): stat is CompactShipStat => stat.value !== undefined,
  );
}

export function ShipTicketBadge() {
  return (
    <span className="inline-flex rounded-full border border-amber-glow/60 bg-amber-glow/15 px-2.5 py-1 text-[0.68rem] font-bold tracking-wider text-amber-glow">
      SHIP TICKET
    </span>
  );
}

export function ticketDisplayName(details: ShipDetails): string | null {
  return details.ticketNumber !== undefined
    ? `Ship Exchange Ticket (No.${details.ticketNumber})`
    : null;
}

function ShipSkillIcon({ skill }: { skill: ShipSkill }) {
  const tooltip = useNameTooltip();

  return (
    <span
      aria-label={skill.name}
      className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/35"
      onBlur={tooltip.hide}
      onContextMenu={tooltip.showFromContextMenu}
      onFocus={tooltip.show}
      onPointerCancel={tooltip.endLongPress}
      onPointerDown={tooltip.startLongPress}
      onPointerLeave={tooltip.endLongPress}
      onPointerUp={tooltip.endLongPress}
      onMouseEnter={tooltip.show}
      onMouseLeave={tooltip.hide}
      role="img"
      tabIndex={0}
    >
      <img
        alt=""
        className="h-7 w-7 object-contain"
        decoding="async"
        loading="lazy"
        src={shipSkillIconUrl(skill.iconId)}
      />
      {tooltip.isTooltipVisible ? <NameTooltip name={skill.name} /> : null}
    </span>
  );
}

function ShipStatChip({ stat }: { stat: CompactShipStat }) {
  const tooltip = useNameTooltip();

  return (
    <li
      aria-label={`${stat.label}: ${stat.value}`}
      className="relative flex min-w-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1"
      onBlur={tooltip.hide}
      onContextMenu={tooltip.showFromContextMenu}
      onFocus={tooltip.show}
      onMouseEnter={tooltip.show}
      onMouseLeave={tooltip.hide}
      onPointerCancel={tooltip.endLongPress}
      onPointerDown={tooltip.startLongPress}
      onPointerLeave={tooltip.endLongPress}
      onPointerUp={tooltip.endLongPress}
      tabIndex={0}
    >
      <ShipStatImage name={stat.name} />
      <span className="font-semibold tabular-nums">{stat.value}</span>
      {tooltip.isTooltipVisible ? <NameTooltip name={stat.label} /> : null}
    </li>
  );
}

function CompactShipSpecifications({ details }: { details: ShipDetails }) {
  if (details.isTicket) {
    const ticketName = ticketDisplayName(details);
    return (
      <div>
        <ShipTicketBadge />
        {ticketName ? (
          <p className="mt-2 text-sm text-slate-200">{ticketName}</p>
        ) : null}
      </div>
    );
  }

  const stats = getCompactShipStats(details);
  const skills = [
    details.originalSkill,
    ...(details.optionalSkills ?? []),
  ].filter((skill): skill is ShipSkill => skill != null);

  if (stats.length === 0 && skills.length === 0) return null;

  return (
    <ul
      aria-label="Ship specifications and skills"
      className="grid grid-cols-3 gap-1.5 text-[0.7rem] text-slate-200 sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <ShipStatChip key={stat.label} stat={stat} />
      ))}
      {skills.map((skill) => (
        <li
          className="flex min-w-0 items-center justify-center rounded-lg border border-amber-glow/20 bg-amber-glow/10 px-1.5 py-1"
          key={`${skill.iconId}-card`}
        >
          <ShipSkillIcon skill={skill} />
        </li>
      ))}
    </ul>
  );
}

function CompactEquipmentSpecifications({
  details,
}: {
  details: EquipmentDetails;
}) {
  const durability = formatDurability(details);
  const stats: Array<{ label: string; value: string }> = [
    ...(durability ? [{ label: "Durability", value: durability }] : []),
    ...(details.formality !== undefined
      ? [{ label: "Formality", value: String(details.formality) }]
      : []),
    ...(details.disguiseLevel !== undefined
      ? [{ label: "Disguise", value: String(details.disguiseLevel) }]
      : []),
    ...(details.attackPower !== undefined
      ? [{ label: "Attack", value: String(details.attackPower) }]
      : []),
    ...(details.defencePower !== undefined
      ? [{ label: "Defence", value: String(details.defencePower) }]
      : []),
  ];
  const skills = details.skillBonuses ?? [];

  if (stats.length === 0 && skills.length === 0) return null;

  return (
    <ul
      aria-label="Equipment specifications and skills"
      className="flex flex-wrap gap-1.5 text-[0.7rem] text-slate-200"
    >
      {stats.map((stat) => (
        <li
          className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 font-semibold tabular-nums"
          key={stat.label}
        >
          {stat.label} {stat.value}
        </li>
      ))}
      {skills.map((skill) => (
        <li
          className="rounded-lg border border-amber-glow/20 bg-amber-glow/10 px-1.5 py-1 font-semibold"
          key={skill.iconId}
        >
          {skill.name} +{skill.value}
        </li>
      ))}
    </ul>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-amber-glow/70 hover:bg-white/10"
    >
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-sea-blue/25 to-ink/90 text-5xl">
        {listing.shipDetails ? (
          <ShipTypeArt
            rowPower={listing.shipDetails.performance?.rowPower ?? 0}
            type={listing.shipDetails.type}
          />
        ) : (
          <span aria-hidden="true">{listing.imageEmoji}</span>
        )}
        {listing.shipDetails ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink/85 to-transparent" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{listing.title}</h3>
          <span className="flex flex-wrap justify-end gap-2">
            {listing.soldAt ? (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100">
                SOLD
              </span>
            ) : null}
            {listing.collection === "legacy" && (
              <span className="rounded-full bg-amber-glow/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-glow">
                Legacy
              </span>
            )}
            <span className="rounded-full bg-sea-blue/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
              {listing.category}
            </span>
            {listing.shipDetails ? (
              <span className="rounded-full bg-amber-glow/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-glow">
                {formatShipType(listing.shipDetails.type)}
                {listing.shipDetails.shipClass
                  ? ` · ${formatShipClass(listing.shipDetails.shipClass)}`
                  : ""}
              </span>
            ) : null}
          </span>
        </div>
        <p className="text-xl font-semibold text-amber-glow">
          {formatListingPrice(listing.price, listing.currency)}
        </p>
        {listing.shipDetails ? (
          <CompactShipSpecifications details={listing.shipDetails} />
        ) : null}
        {listing.equipmentDetails ? (
          <CompactEquipmentSpecifications details={listing.equipmentDetails} />
        ) : null}
        <dl className="mt-auto grid gap-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Seller</dt>
            <dd>
              <span className="text-slate-400">Seller:</span> {listing.seller}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Location</dt>
            <dd>
              <span className="text-slate-400">Location:</span>{" "}
              {listing.location}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
