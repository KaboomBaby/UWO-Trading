import type { ShipClass, ShipType } from "../../types/listing";

const shipTypeLabels = {
  battle: "Battle",
  trade: "Trade",
  adventure: "Adventure",
} as const satisfies Record<ShipType, string>;

const shipClassLabels = {
  light: "Light",
  standard: "Standard",
  heavy: "Heavy",
} as const satisfies Record<ShipClass, string>;

export function formatShipType(type: ShipType) {
  return shipTypeLabels[type];
}

export function formatShipClass(shipClass: ShipClass) {
  return shipClassLabels[shipClass];
}

export function ShipTypeIcon({
  type,
  className = "h-16 w-16",
}: {
  type: ShipType;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      viewBox="0 0 48 48"
    >
      <circle
        className="fill-sea-blue/20 stroke-amber-glow/70"
        cx="24"
        cy="24"
        r="21"
      />
      {type === "battle" ? (
        <>
          <path d="M16 32 30 18" />
          <path d="m30 18 4-4 2 2-4 4" />
          <path d="M32 32 18 18" />
          <path d="m18 18-4-4-2 2 4 4" />
          <path d="M15 33h5v-5" />
          <path d="M33 33h-5v-5" />
        </>
      ) : null}
      {type === "trade" ? (
        <>
          <path d="M12 20h24v13a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V20Z" />
          <path d="M12 20a12 12 0 0 1 24 0" />
          <path d="M24 14v6" />
          <path d="M20 26h8" />
        </>
      ) : null}
      {type === "adventure" ? (
        <>
          <circle cx="24" cy="24" r="13" />
          <path d="m29 19-3 8-8 3 3-8 8-3Z" />
        </>
      ) : null}
    </svg>
  );
}

type ShipStatIconName =
  | "verticalSail"
  | "horizontalSail"
  | "rowPower"
  | "turnSpeed"
  | "waveResistance"
  | "armour"
  | "improvements"
  | "crew"
  | "cannons"
  | "cargo"
  | "sailors"
  | "adventure"
  | "trade"
  | "battle";

export function ShipStatIcon({ name }: { name: ShipStatIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-amber-glow"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {name === "verticalSail" ? (
        <>
          <path d="M12 3v18" />
          <path d="M12 4 6 13h12L12 4Z" />
        </>
      ) : null}
      {name === "horizontalSail" ? (
        <>
          <path d="M3 12h18" />
          <path d="M5 12h14l-4-5" />
          <path d="M5 12h14l-4 5" />
        </>
      ) : null}
      {name === "rowPower" ? (
        <>
          <path d="M4 20 18 6" />
          <path d="m18 6 3-2 1 3-3 2" />
          <path d="M8 16c4 1 7-1 8-4" />
        </>
      ) : null}
      {name === "turnSpeed" ? (
        <>
          <path d="M20 12a8 8 0 1 1-3-6" />
          <path d="M17 3v4h4" />
        </>
      ) : null}
      {name === "waveResistance" ? (
        <>
          <path d="M3 10c3-3 6 3 9 0s6 3 9 0" />
          <path d="M3 16c3-3 6 3 9 0s6 3 9 0" />
        </>
      ) : null}
      {name === "armour" ? (
        <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3Z" />
      ) : null}
      {name === "improvements" ? (
        <>
          <circle cx="12" cy="10" r="6" />
          <path d="m12 13 1.8 3.6H18l-3 2.8.9 3.6-3.9-2.2-3.9 2.2.9-3.6-3-2.8h4.2L12 13Z" />
        </>
      ) : null}
      {name === "crew" || name === "sailors" ? (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21c0-4 3-7 7-7s7 3 7 7" />
        </>
      ) : null}
      {name === "cannons" ? (
        <>
          <circle cx="9" cy="15" r="4" />
          <circle cx="17" cy="15" r="3" />
          <path d="M12 7h4" />
        </>
      ) : null}
      {name === "cargo" ? (
        <>
          <path d="M4 8h16v12H4z" />
          <path d="M4 12h16" />
          <path d="M10 8v12" />
        </>
      ) : null}
      {name === "adventure" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m15 9-2 4-4 2 2-4 4-2Z" />
        </>
      ) : null}
      {name === "trade" ? (
        <>
          <path d="M5 8h14l-2 11H7L5 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </>
      ) : null}
      {name === "battle" ? (
        <>
          <path d="m5 19 10-10" />
          <path d="m15 9 3-3 2 2-3 3" />
          <path d="M5 19h4" />
        </>
      ) : null}
    </svg>
  );
}
