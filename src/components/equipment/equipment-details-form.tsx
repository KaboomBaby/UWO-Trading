import { getEquipmentSkill } from "../../data/equipment-skills";
import { EquipmentSkillPicker } from "./equipment-skill-picker";
import {
  EQUIPMENT_WEARERS,
  type EquipmentDetails,
  type EquipmentWearer,
} from "../../types/listing";

export type EquipmentSkillSlot = {
  iconId: string;
  value: string;
};

export type EquipmentEffectRow = {
  name: string;
  rank: string;
};

export type EquipmentFormState = {
  wearer: EquipmentWearer | "";
  durabilityCurrent: string;
  durabilityMax: string;
  formality: string;
  disguiseLevel: string;
  attackPower: string;
  defencePower: string;
  weaponCategory: string;
  skillBonuses: EquipmentSkillSlot[];
  effects: EquipmentEffectRow[];
};

const emptySkillSlot = (): EquipmentSkillSlot => ({ iconId: "", value: "" });
const emptyEffectRow = (): EquipmentEffectRow => ({ name: "", rank: "" });
export const emptyEquipmentForm: EquipmentFormState = {
  wearer: "",
  durabilityCurrent: "",
  durabilityMax: "",
  formality: "",
  disguiseLevel: "",
  attackPower: "",
  defencePower: "",
  weaponCategory: "",
  skillBonuses: [emptySkillSlot(), emptySkillSlot(), emptySkillSlot()],
  effects: [emptyEffectRow()],
};

export type EquipmentFormErrors = Partial<
  Record<keyof EquipmentFormState, string>
>;

type EquipmentFormChange = <K extends keyof EquipmentFormState>(
  field: K,
  value: EquipmentFormState[K],
) => void;

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

const wearerLabels: Record<EquipmentWearer, string> = {
  male: "♂ Male",
  female: "♀ Female",
  unisex: "Unisex",
};

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
}: {
  label: string;
  field: Exclude<
    keyof EquipmentFormState,
    "wearer" | "weaponCategory" | "skillBonuses" | "effects"
  >;
  form: EquipmentFormState;
  errors: EquipmentFormErrors;
  onChange: EquipmentFormChange;
}) {
  const errorId = `${field}-error`;
  return (
    <div>
      <label className="text-sm font-semibold text-slate-200" htmlFor={field}>
        {label}
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

const statRequirements: Array<{
  field:
    | "durabilityCurrent"
    | "durabilityMax"
    | "formality"
    | "disguiseLevel"
    | "attackPower"
    | "defencePower";
  label: string;
}> = [
  { field: "durabilityCurrent", label: "Durability (current)" },
  { field: "durabilityMax", label: "Durability (max)" },
  { field: "formality", label: "Formality" },
  { field: "disguiseLevel", label: "Disguise Level" },
  { field: "attackPower", label: "Attack Power" },
  { field: "defencePower", label: "Defence Power" },
];

export function validateEquipmentForm(
  form: EquipmentFormState,
): EquipmentFormErrors {
  const errors: EquipmentFormErrors = {};

  for (const { field, label } of statRequirements) {
    const raw = form[field].trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      errors[field] = `${label} must be a whole number of zero or more.`;
    }
  }

  if (form.weaponCategory.trim().length > 60) {
    errors.weaponCategory = "Weapon Category must be 60 characters or fewer.";
  }

  const chosen = form.skillBonuses.filter((slot) => slot.iconId);
  const chosenIds = chosen.map((slot) => slot.iconId);
  if (new Set(chosenIds).size !== chosenIds.length) {
    errors.skillBonuses = "Choose each equipment skill only once.";
  } else if (
    chosen.some((slot) => {
      const value = Number(slot.value.trim());
      return !slot.value.trim() || !Number.isInteger(value) || value < 1;
    })
  ) {
    errors.skillBonuses =
      "Skill bonus values must be whole numbers of one or more.";
  }

  if (
    form.effects.some((row) => {
      if (!row.rank.trim()) return false;
      const rank = Number(row.rank.trim());
      return !Number.isInteger(rank) || rank < 1;
    })
  ) {
    errors.effects = "Effect ranks must be whole numbers of one or more.";
  }
  if (form.effects.some((row) => row.rank.trim() && !row.name.trim())) {
    errors.effects = "Equipment Effects need a name.";
  }

  return errors;
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

export function equipmentDetailsFromForm(
  form: EquipmentFormState,
): EquipmentDetails | null {
  const details: EquipmentDetails = {};

  if (form.wearer) details.wearer = form.wearer;
  const durabilityCurrent = numberOrUndefined(form.durabilityCurrent);
  if (durabilityCurrent !== undefined)
    details.durabilityCurrent = durabilityCurrent;
  const durabilityMax = numberOrUndefined(form.durabilityMax);
  if (durabilityMax !== undefined) details.durabilityMax = durabilityMax;
  const formality = numberOrUndefined(form.formality);
  if (formality !== undefined) details.formality = formality;
  const disguiseLevel = numberOrUndefined(form.disguiseLevel);
  if (disguiseLevel !== undefined) details.disguiseLevel = disguiseLevel;
  const attackPower = numberOrUndefined(form.attackPower);
  if (attackPower !== undefined) details.attackPower = attackPower;
  const defencePower = numberOrUndefined(form.defencePower);
  if (defencePower !== undefined) details.defencePower = defencePower;
  if (form.weaponCategory.trim())
    details.weaponCategory = form.weaponCategory.trim();

  const skillBonuses = form.skillBonuses
    .filter((slot) => slot.iconId)
    .map((slot) => {
      const skill = getEquipmentSkill(slot.iconId);
      return skill
        ? {
            name: skill.name,
            iconId: skill.iconId,
            value: Number(slot.value.trim()),
          }
        : null;
    })
    .filter(
      (bonus): bonus is { name: string; iconId: string; value: number } =>
        bonus !== null,
    );
  if (skillBonuses.length > 0) details.skillBonuses = skillBonuses;

  const effects = form.effects
    .filter((row) => row.name.trim())
    .map((row) => {
      const rank = numberOrUndefined(row.rank);
      return {
        name: row.name.trim(),
        ...(rank !== undefined ? { rank } : {}),
      };
    });
  if (effects.length > 0) details.effects = effects;

  return Object.keys(details).length > 0 ? details : null;
}

export function equipmentFormFromDetails(
  details: EquipmentDetails | null | undefined,
): EquipmentFormState {
  if (!details) return structuredClone(emptyEquipmentForm);

  const stat = (value: number | undefined) =>
    value === undefined ? "" : String(value);

  const skillBonuses = [0, 1, 2].map((index) => {
    const bonus = details.skillBonuses?.[index];
    return bonus
      ? { iconId: bonus.iconId, value: String(bonus.value) }
      : emptySkillSlot();
  });
  const effects =
    details.effects && details.effects.length > 0
      ? details.effects.map((effect) => ({
          name: effect.name,
          rank: stat(effect.rank),
        }))
      : [emptyEffectRow()];

  return {
    wearer: details.wearer ?? "",
    durabilityCurrent: stat(details.durabilityCurrent),
    durabilityMax: stat(details.durabilityMax),
    formality: stat(details.formality),
    disguiseLevel: stat(details.disguiseLevel),
    attackPower: stat(details.attackPower),
    defencePower: stat(details.defencePower),
    weaponCategory: details.weaponCategory ?? "",
    skillBonuses,
    effects,
  };
}

export function EquipmentDetailsForm({
  form,
  errors,
  onChange,
}: {
  form: EquipmentFormState;
  errors: EquipmentFormErrors;
  onChange: EquipmentFormChange;
}) {
  const selectedIconIds = form.skillBonuses
    .map((slot) => slot.iconId)
    .filter(Boolean);

  function updateSkillSlot(index: number, slot: EquipmentSkillSlot) {
    const next = [...form.skillBonuses];
    next[index] = slot;
    onChange("skillBonuses", next);
  }

  function updateEffectRow(index: number, row: EquipmentEffectRow) {
    const next = [...form.effects];
    next[index] = row;
    onChange("effects", next);
  }

  return (
    <section
      aria-label="Equipment specifications"
      className="rounded-xl border border-amber-glow/25 bg-ink/60 p-5"
    >
      <p className="text-sm text-slate-400">
        Stats are optional — leave blank any you do not want to show. Blanks
        stay blank. The item itself needs only its name; there is no picture to
        add.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label
            className="text-sm font-semibold text-slate-200"
            htmlFor="wearer"
          >
            Worn by
          </label>
          <select
            className={inputClassName}
            id="wearer"
            name="wearer"
            onChange={(event) =>
              onChange("wearer", event.target.value as EquipmentWearer | "")
            }
            value={form.wearer}
          >
            <option value="">Not shown</option>
            {EQUIPMENT_WEARERS.map((wearer) => (
              <option key={wearer} value={wearer}>
                {wearerLabels[wearer]}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          errors={errors}
          field="durabilityCurrent"
          form={form}
          label="Durability (current)"
          onChange={onChange}
        />
        <NumberField
          errors={errors}
          field="durabilityMax"
          form={form}
          label="Durability (max)"
          onChange={onChange}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          errors={errors}
          field="formality"
          form={form}
          label="Formality"
          onChange={onChange}
        />
        <NumberField
          errors={errors}
          field="disguiseLevel"
          form={form}
          label="Disguise Level"
          onChange={onChange}
        />
        <NumberField
          errors={errors}
          field="attackPower"
          form={form}
          label="Attack Power"
          onChange={onChange}
        />
        <NumberField
          errors={errors}
          field="defencePower"
          form={form}
          label="Defence Power"
          onChange={onChange}
        />
      </div>

      <div className="mt-5 max-w-xs">
        <label
          className="text-sm font-semibold text-slate-200"
          htmlFor="weaponCategory"
        >
          Weapon Category{" "}
          <span className="font-normal text-slate-400">(weapons only)</span>
        </label>
        <input
          aria-describedby={
            errors.weaponCategory ? "weaponCategory-error" : undefined
          }
          aria-invalid={Boolean(errors.weaponCategory)}
          className={inputClassName}
          id="weaponCategory"
          name="weaponCategory"
          onChange={(event) => onChange("weaponCategory", event.target.value)}
          placeholder="Bow"
          type="text"
          value={form.weaponCategory}
        />
        <FieldError id="weaponCategory-error" message={errors.weaponCategory} />
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
          Skill bonuses
        </legend>
        <p className="mt-2 text-sm text-slate-400">
          Equipment carries up to three skill bonuses. Choose a skill and the
          value your item shows (for example +3). Leave a slot empty when the
          item has fewer.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {form.skillBonuses.map((slot, index) => {
            const selectedSkill = slot.iconId
              ? getEquipmentSkill(slot.iconId)
              : undefined;
            return (
              <div key={index}>
                <EquipmentSkillPicker
                  disabledIconIds={selectedIconIds.filter(
                    (iconId) => iconId !== slot.iconId,
                  )}
                  id={`skill-bonus-${index + 1}`}
                  label={`Skill bonus ${index + 1}`}
                  onChange={(iconId) =>
                    updateSkillSlot(index, { ...slot, iconId })
                  }
                  selectedSkill={selectedSkill}
                />
                <div className="mt-3">
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor={`skill-bonus-value-${index + 1}`}
                  >
                    Bonus value {index + 1}
                  </label>
                  <input
                    className={inputClassName}
                    id={`skill-bonus-value-${index + 1}`}
                    inputMode="numeric"
                    min="1"
                    name={`skillBonusValue${index + 1}`}
                    onChange={(event) =>
                      updateSkillSlot(index, {
                        ...slot,
                        value: event.target.value,
                      })
                    }
                    placeholder="3"
                    step="1"
                    type="number"
                    value={slot.value}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {errors.skillBonuses ? (
          <p className="mt-2 text-sm text-red-200" role="alert">
            {errors.skillBonuses}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
          Equipment Effects
        </legend>
        <div className="mt-3 grid gap-4">
          {form.effects.map((row, index) => (
            <div className="flex flex-wrap items-end gap-3" key={index}>
              <div className="min-w-56 flex-1">
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor={`effect-name-${index + 1}`}
                >
                  Effect name {index + 1}
                </label>
                <input
                  className={inputClassName}
                  id={`effect-name-${index + 1}`}
                  name={`effectName${index + 1}`}
                  onChange={(event) =>
                    updateEffectRow(index, { ...row, name: event.target.value })
                  }
                  placeholder="Reduce Supply Consumption"
                  type="text"
                  value={row.name}
                />
              </div>
              <div className="w-32">
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor={`effect-rank-${index + 1}`}
                >
                  Rank {index + 1}{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  className={inputClassName}
                  id={`effect-rank-${index + 1}`}
                  inputMode="numeric"
                  min="1"
                  name={`effectRank${index + 1}`}
                  onChange={(event) =>
                    updateEffectRow(index, { ...row, rank: event.target.value })
                  }
                  step="1"
                  type="number"
                  value={row.rank}
                />
              </div>
              {form.effects.length > 1 ? (
                <button
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() =>
                    onChange(
                      "effects",
                      form.effects.filter((_, i) => i !== index),
                    )
                  }
                  type="button"
                >
                  Remove effect {index + 1}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {form.effects.length < 3 ? (
          <button
            className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={() =>
              onChange("effects", [...form.effects, emptyEffectRow()])
            }
            type="button"
          >
            Add an effect
          </button>
        ) : null}
        {errors.effects ? (
          <p className="mt-2 text-sm text-red-200" role="alert">
            {errors.effects}
          </p>
        ) : null}
      </fieldset>
    </section>
  );
}
