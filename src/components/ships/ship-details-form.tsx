import {
  SHIP_CLASSES,
  SHIP_TYPES,
  type ShipClass,
  type ShipDetails,
  type ShipType,
} from "../../types/listing";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
  getOptionalShipSkill,
  getOriginalShipSkill,
} from "../../data/ship-skills";
import { ShipSkillPicker } from "./ship-skill-picker";
import { ShipStatIcon, ShipTypeIcon, formatShipType } from "./ship-visuals";

export type ShipListingMode = "built" | "ticket";

export type ShipFormState = {
  mode: ShipListingMode;
  ticketNumber: string;
  type: ShipType | "";
  shipClass: ShipClass | "";
  grade: string;
  role: string;
  verticalSail: string;
  horizontalSail: string;
  rowPower: string;
  turnSpeed: string;
  waveResistance: string;
  armour: string;
  improvements: string;
  durability: string;
  crew: string;
  cannons: string;
  cargo: string;
  sailorsRequired: string;
  adventureLevel: string;
  tradeLevel: string;
  battleLevel: string;
  originalSkill: string;
  optionalSkills: string[];
};

export const emptyShipForm: ShipFormState = {
  mode: "built",
  ticketNumber: "",
  type: "",
  shipClass: "",
  grade: "",
  role: "",
  verticalSail: "",
  horizontalSail: "",
  rowPower: "",
  turnSpeed: "",
  waveResistance: "",
  armour: "",
  improvements: "",
  durability: "",
  crew: "",
  cannons: "",
  cargo: "",
  sailorsRequired: "",
  adventureLevel: "",
  tradeLevel: "",
  battleLevel: "",
  originalSkill: "",
  optionalSkills: ["", "", "", "", ""],
};

export type ShipFormErrors = Partial<Record<keyof ShipFormState, string>>;

type ShipTextField = Exclude<keyof ShipFormState, "optionalSkills">;

type ShipFormChange = <K extends keyof ShipFormState>(
  field: K,
  value: ShipFormState[K],
) => void;

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

const numberRequirements: Array<{
  field: ShipTextField;
  label: string;
}> = [
  { field: "grade", label: "Grade" },
  { field: "verticalSail", label: "Vertical sail" },
  { field: "horizontalSail", label: "Horizontal sail" },
  { field: "rowPower", label: "Row power" },
  { field: "turnSpeed", label: "Turn speed" },
  { field: "waveResistance", label: "Wave resistance" },
  { field: "armour", label: "Armour" },
  { field: "improvements", label: "Improvements" },
  { field: "durability", label: "Durability" },
  { field: "crew", label: "Crew capacity" },
  { field: "cannons", label: "Cannon capacity" },
  { field: "cargo", label: "Cargo capacity" },
  { field: "sailorsRequired", label: "Sailors required" },
  { field: "adventureLevel", label: "Adventure Lv" },
  { field: "tradeLevel", label: "Trade Lv" },
  { field: "battleLevel", label: "Battle Lv" },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-200" id={id}>
      {message}
    </p>
  );
}

function NumberField({
  label,
  field,
  form,
  errors,
  onChange,
  icon,
}: {
  label: string;
  field: ShipTextField;
  form: ShipFormState;
  errors: ShipFormErrors;
  onChange: ShipFormChange;
  icon?: Parameters<typeof ShipStatIcon>[0]["name"];
}) {
  const errorId = `${field}-error`;
  return (
    <div>
      <label className="text-sm font-semibold text-slate-200" htmlFor={field}>
        {icon ? <ShipStatIcon name={icon} /> : null} {label}
      </label>
      <input
        aria-describedby={errors[field] ? errorId : undefined}
        aria-invalid={Boolean(errors[field])}
        className={inputClassName}
        id={field}
        inputMode="numeric"
        min="0"
        name={field}
        onChange={(event) => onChange(field, event.target.value)}
        step="1"
        type="number"
        value={form[field]}
      />
      <FieldError id={errorId} message={errors[field]} />
    </div>
  );
}

export function validateShipForm(form: ShipFormState): ShipFormErrors {
  const errors: ShipFormErrors = {};
  if (!form.type) errors.type = "Ship type is required.";
  if (form.mode === "ticket") {
    const ticketNumber = form.ticketNumber.trim();
    if (ticketNumber) {
      const value = Number(ticketNumber);
      if (!Number.isInteger(value) || value <= 0) {
        errors.ticketNumber = "Ticket No. must be a positive whole number.";
      }
    }
    return errors;
  }
  if (!form.shipClass) errors.shipClass = "Ship class is required.";
  const selectedSkills = [form.originalSkill, ...form.optionalSkills].filter(
    Boolean,
  );
  if (new Set(selectedSkills).size !== selectedSkills.length) {
    errors.optionalSkills = "Choose each ship skill only once.";
  }

  for (const { field, label } of numberRequirements) {
    const raw = form[field].trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      errors[field] = `${label} must be a whole number of zero or more.`;
    }
  }
  return errors;
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

function presentStats<T extends Record<string, number | undefined>>(
  stats: T,
): Partial<T> | undefined {
  const entries = Object.entries(stats).filter(
    (entry): entry is [string, number] => entry[1] !== undefined,
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as Partial<T>)
    : undefined;
}

export function shipDetailsFromForm(form: ShipFormState): ShipDetails {
  if (form.mode === "ticket") {
    const ticketNumber = numberOrUndefined(form.ticketNumber);
    return {
      type: form.type as ShipType,
      isTicket: true,
      ...(ticketNumber !== undefined ? { ticketNumber } : {}),
    };
  }

  const grade = numberOrUndefined(form.grade);
  const improvements = numberOrUndefined(form.improvements);
  const durability = numberOrUndefined(form.durability);
  const performance = presentStats({
    verticalSail: numberOrUndefined(form.verticalSail),
    horizontalSail: numberOrUndefined(form.horizontalSail),
    rowPower: numberOrUndefined(form.rowPower),
    turnSpeed: numberOrUndefined(form.turnSpeed),
    waveResistance: numberOrUndefined(form.waveResistance),
    armour: numberOrUndefined(form.armour),
  });
  const hold = presentStats({
    crew: numberOrUndefined(form.crew),
    cannons: numberOrUndefined(form.cannons),
    cargo: numberOrUndefined(form.cargo),
    sailorsRequired: numberOrUndefined(form.sailorsRequired),
  });
  const sailingRequirements = presentStats({
    adventureLevel: numberOrUndefined(form.adventureLevel),
    tradeLevel: numberOrUndefined(form.tradeLevel),
    battleLevel: numberOrUndefined(form.battleLevel),
  });

  return {
    type: form.type as ShipType,
    shipClass: form.shipClass as ShipClass,
    ...(grade !== undefined ? { grade } : {}),
    ...(form.role.trim() ? { role: form.role.trim() } : {}),
    ...(performance ? { performance } : {}),
    ...(improvements !== undefined ? { improvements } : {}),
    ...(durability !== undefined ? { durability } : {}),
    ...(hold ? { hold } : {}),
    ...(sailingRequirements ? { sailingRequirements } : {}),
    originalSkill: (() => {
      const skill = form.originalSkill
        ? getOriginalShipSkill(form.originalSkill)
        : undefined;
      return skill ? { name: skill.name, iconId: skill.iconId } : null;
    })(),
    optionalSkills: form.optionalSkills
      .filter(Boolean)
      .map((iconId) => {
        const skill = getOptionalShipSkill(iconId);
        return skill ? { name: skill.name, iconId: skill.iconId } : null;
      })
      .filter(
        (skill): skill is { name: string; iconId: string } => skill !== null,
      ),
  };
}

export function shipFormFromDetails(
  details: ShipDetails | null | undefined,
): ShipFormState {
  if (!details) return { ...emptyShipForm };

  const stat = (value: number | undefined) =>
    value === undefined ? "" : String(value);

  return {
    mode: details.isTicket ? "ticket" : "built",
    ticketNumber: stat(details.ticketNumber),
    type: details.type,
    shipClass: details.shipClass ?? "",
    grade: stat(details.grade),
    role: details.role ?? "",
    verticalSail: stat(details.performance?.verticalSail),
    horizontalSail: stat(details.performance?.horizontalSail),
    rowPower: stat(details.performance?.rowPower),
    turnSpeed: stat(details.performance?.turnSpeed),
    waveResistance: stat(details.performance?.waveResistance),
    armour: stat(details.performance?.armour),
    improvements: stat(details.improvements),
    durability: stat(details.durability),
    crew: stat(details.hold?.crew),
    cannons: stat(details.hold?.cannons),
    cargo: stat(details.hold?.cargo),
    sailorsRequired: stat(details.hold?.sailorsRequired),
    adventureLevel: stat(details.sailingRequirements?.adventureLevel),
    tradeLevel: stat(details.sailingRequirements?.tradeLevel),
    battleLevel: stat(details.sailingRequirements?.battleLevel),
    originalSkill: details.originalSkill?.iconId ?? "",
    optionalSkills: [
      details.optionalSkills?.[0]?.iconId ?? "",
      details.optionalSkills?.[1]?.iconId ?? "",
      details.optionalSkills?.[2]?.iconId ?? "",
      details.optionalSkills?.[3]?.iconId ?? "",
      details.optionalSkills?.[4]?.iconId ?? "",
    ],
  };
}

export function ShipDetailsForm({
  form,
  errors,
  onChange,
}: {
  form: ShipFormState;
  errors: ShipFormErrors;
  onChange: ShipFormChange;
}) {
  const originalSkill = form.originalSkill
    ? getOriginalShipSkill(form.originalSkill)
    : undefined;
  const selectedOptionalSkills = form.optionalSkills.map((iconId) =>
    iconId ? getOptionalShipSkill(iconId) : undefined,
  );
  const allSelectedIconIds = [
    form.originalSkill,
    ...form.optionalSkills,
  ].filter(Boolean);

  function updateOptionalSkill(index: number, iconId: string) {
    const nextSkills = [...form.optionalSkills];
    nextSkills[index] = iconId;
    onChange("optionalSkills", nextSkills);
  }

  return (
    <section
      aria-label="Ship specifications"
      className="rounded-xl border border-amber-glow/25 bg-ink/60 p-5"
    >
      <div
        aria-label="Ship listing kind"
        className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-ink/70 p-1"
        role="group"
      >
        <button
          aria-pressed={form.mode === "built"}
          className={
            form.mode === "built"
              ? "flex-1 rounded-lg bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
              : "flex-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          }
          onClick={() => onChange("mode", "built")}
          type="button"
        >
          Built ship
        </button>
        <button
          aria-pressed={form.mode === "ticket"}
          className={
            form.mode === "ticket"
              ? "flex-1 rounded-lg bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
              : "flex-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          }
          onClick={() => onChange("mode", "ticket")}
          type="button"
        >
          Ship ticket
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1">
          <label
            className="text-sm font-semibold text-slate-200"
            htmlFor="type"
          >
            Ship type
          </label>
          <select
            aria-invalid={Boolean(errors.type)}
            className={inputClassName}
            id="type"
            name="type"
            onChange={(event) =>
              onChange("type", event.target.value as ShipType)
            }
            required
            value={form.type}
          >
            <option value="">Select a ship type</option>
            {SHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatShipType(type)}
              </option>
            ))}
          </select>
          <FieldError id="type-error" message={errors.type} />
        </div>
        {form.mode === "built" ? (
          <div className="min-w-48 flex-1">
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="shipClass"
            >
              Ship class
            </label>
            <select
              aria-invalid={Boolean(errors.shipClass)}
              className={inputClassName}
              id="shipClass"
              name="shipClass"
              onChange={(event) =>
                onChange("shipClass", event.target.value as ShipClass)
              }
              required
              value={form.shipClass}
            >
              <option value="">Select a class</option>
              {SHIP_CLASSES.map((shipClass) => (
                <option key={shipClass} value={shipClass}>
                  {shipClass === "light"
                    ? "Light"
                    : shipClass === "standard"
                      ? "Standard"
                      : "Heavy"}
                </option>
              ))}
            </select>
            <FieldError id="shipClass-error" message={errors.shipClass} />
          </div>
        ) : null}
        <div className="pb-2">
          {form.type ? (
            <ShipTypeIcon type={form.type} className="h-16 w-16" />
          ) : null}
        </div>
      </div>

      {form.mode === "ticket" ? (
        <div className="mt-5 max-w-xs">
          <label
            className="text-sm font-semibold text-slate-200"
            htmlFor="ticketNumber"
          >
            Ticket No.{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            aria-describedby={
              errors.ticketNumber ? "ticketNumber-error" : undefined
            }
            aria-invalid={Boolean(errors.ticketNumber)}
            className={inputClassName}
            id="ticketNumber"
            inputMode="numeric"
            min="1"
            name="ticketNumber"
            onChange={(event) => onChange("ticketNumber", event.target.value)}
            placeholder="407"
            step="1"
            type="number"
            value={form.ticketNumber}
          />
          <p className="mt-2 text-sm text-slate-400">
            The number printed on the ticket — it identifies the ship this
            ticket gives.
          </p>
          <FieldError id="ticketNumber-error" message={errors.ticketNumber} />
        </div>
      ) : (
        <>
          <p className="mt-5 text-sm text-slate-400">
            Stats are optional — leave blank any you do not want to show. Blanks
            stay blank.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberField
              errors={errors}
              field="grade"
              form={form}
              label="Grade"
              onChange={onChange}
            />
            <div>
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="role"
              >
                Ship role
              </label>
              <input
                aria-invalid={Boolean(errors.role)}
                className={inputClassName}
                id="role"
                name="role"
                onChange={(event) => onChange("role", event.target.value)}
                placeholder="High Speed Cargo Ship"
                type="text"
                value={form.role}
              />
              <FieldError id="role-error" message={errors.role} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
            <fieldset>
              <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
                Ship performance
              </legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <NumberField
                  errors={errors}
                  field="verticalSail"
                  form={form}
                  icon="verticalSail"
                  label="Vertical sail"
                  onChange={onChange}
                />
                <NumberField
                  errors={errors}
                  field="horizontalSail"
                  form={form}
                  icon="horizontalSail"
                  label="Horizontal sail"
                  onChange={onChange}
                />
                <NumberField
                  errors={errors}
                  field="rowPower"
                  form={form}
                  icon="rowPower"
                  label="Row power"
                  onChange={onChange}
                />
                <NumberField
                  errors={errors}
                  field="turnSpeed"
                  form={form}
                  icon="turnSpeed"
                  label="Turn speed"
                  onChange={onChange}
                />
                <NumberField
                  errors={errors}
                  field="waveResistance"
                  form={form}
                  icon="waveResistance"
                  label="Wave resistance"
                  onChange={onChange}
                />
                <NumberField
                  errors={errors}
                  field="armour"
                  form={form}
                  icon="armour"
                  label="Armour"
                  onChange={onChange}
                />
              </div>
              <NumberField
                errors={errors}
                field="improvements"
                form={form}
                icon="improvements"
                label="Improvements"
                onChange={onChange}
              />
            </fieldset>
            <NumberField
              errors={errors}
              field="durability"
              form={form}
              label="Durability"
              onChange={onChange}
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
              Ship hold
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                errors={errors}
                field="crew"
                form={form}
                icon="crew"
                label="Crew capacity"
                onChange={onChange}
              />
              <NumberField
                errors={errors}
                field="cannons"
                form={form}
                icon="cannons"
                label="Cannon capacity"
                onChange={onChange}
              />
              <NumberField
                errors={errors}
                field="cargo"
                form={form}
                icon="cargo"
                label="Cargo capacity"
                onChange={onChange}
              />
              <NumberField
                errors={errors}
                field="sailorsRequired"
                form={form}
                icon="sailors"
                label="Sailors required"
                onChange={onChange}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
              Sailing requirements
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <NumberField
                errors={errors}
                field="adventureLevel"
                form={form}
                icon="adventure"
                label="Adventure Lv"
                onChange={onChange}
              />
              <NumberField
                errors={errors}
                field="tradeLevel"
                form={form}
                icon="trade"
                label="Trade Lv"
                onChange={onChange}
              />
              <NumberField
                errors={errors}
                field="battleLevel"
                form={form}
                icon="battle"
                label="Battle Lv"
                onChange={onChange}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
              Ship skills
            </legend>
            <p className="mt-2 text-sm text-slate-400">
              Skills are optional. Choose at most one Original and five Optional
              skills.
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <ShipSkillPicker
                disabledIconIds={allSelectedIconIds.filter(
                  (iconId) => iconId !== form.originalSkill,
                )}
                id="original-skill"
                label="Original skill"
                onChange={(iconId) => onChange("originalSkill", iconId)}
                selectedSkill={originalSkill}
                skills={ORIGINAL_SHIP_SKILLS}
              />
              {form.optionalSkills.map((selectedIconId, index) => {
                const selectedSkill = selectedOptionalSkills[index];
                return (
                  <ShipSkillPicker
                    disabledIconIds={allSelectedIconIds.filter(
                      (iconId) => iconId !== selectedIconId,
                    )}
                    id={`optional-skill-${index + 1}`}
                    key={index}
                    label={`Optional skill ${index + 1}`}
                    onChange={(iconId) => updateOptionalSkill(index, iconId)}
                    selectedSkill={selectedSkill}
                    skills={OPTIONAL_SHIP_SKILLS}
                  />
                );
              })}
            </div>
            {errors.optionalSkills ? (
              <p className="mt-2 text-sm text-red-200" role="alert">
                {errors.optionalSkills}
              </p>
            ) : null}
          </fieldset>
        </>
      )}
    </section>
  );
}
