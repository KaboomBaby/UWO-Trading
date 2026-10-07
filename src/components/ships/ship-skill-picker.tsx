import { useMemo, useState } from "react";

import { shipSkillIconUrl, type ShipSkillRecord } from "../../data/ship-skills";

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

function SkillOption({
  isActive,
  isDisabled,
  onHover,
  onSelect,
  skill,
}: {
  isActive: boolean;
  isDisabled: boolean;
  onHover: () => void;
  onSelect: () => void;
  skill: ShipSkillRecord;
}) {
  return (
    <li
      aria-disabled={isDisabled}
      aria-selected={isActive}
      className={`${isActive ? "bg-amber-glow/20" : ""} ${isDisabled ? "opacity-45" : ""}`}
      id={`${skill.iconId}-option`}
      onMouseEnter={onHover}
      role="option"
    >
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-100 disabled:cursor-not-allowed"
        disabled={isDisabled}
        onClick={onSelect}
        type="button"
      >
        <img
          alt=""
          className="h-8 w-8 rounded-md border border-white/15 bg-black/30 object-contain"
          src={shipSkillIconUrl(skill.iconId)}
        />
        <span>{skill.name}</span>
        {isDisabled ? (
          <span className="ml-auto text-xs text-slate-400">Already chosen</span>
        ) : null}
      </button>
    </li>
  );
}

export function ShipSkillPicker({
  disabledIconIds,
  id,
  label,
  skills,
  selectedSkill,
  onChange,
}: {
  disabledIconIds: string[];
  id: string;
  label: string;
  skills: ShipSkillRecord[];
  selectedSkill: ShipSkillRecord | undefined;
  onChange: (iconId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = `${id}-options`;
  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return skills;
    return skills.filter((skill) => skill.name.toLowerCase().includes(needle));
  }, [query, skills]);

  function selectSkill(iconId: string) {
    onChange(iconId);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <label className="text-sm font-semibold text-slate-200" htmlFor={id}>
        {label}
      </label>
      <input
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        autoComplete="off"
        className={inputClassName}
        id={id}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 100)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) =>
              Math.min(index + 1, filteredSkills.length - 1),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            const skill = filteredSkills[activeIndex];
            if (skill && !disabledIconIds.includes(skill.iconId)) {
              selectSkill(skill.iconId);
            }
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        placeholder={selectedSkill ? selectedSkill.name : `Search ${label}`}
        role="combobox"
        type="text"
        value={query}
      />
      {selectedSkill ? (
        <div className="mt-3 flex items-center gap-3">
          <img
            alt=""
            className="h-10 w-10 rounded-md border border-white/15 bg-black/30 object-contain"
            src={shipSkillIconUrl(selectedSkill.iconId)}
          />
          <span className="text-sm font-medium text-white">
            {selectedSkill.name}
          </span>
          <button
            className="ml-auto rounded-lg border border-white/20 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
            onClick={() => selectSkill("")}
            type="button"
          >
            Clear
          </button>
        </div>
      ) : null}
      {isOpen ? (
        <ul
          aria-label={label}
          className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-ink"
          id={listId}
          role="listbox"
        >
          {filteredSkills.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">
              No matching skills.
            </li>
          ) : (
            filteredSkills.map((skill, index) => (
              <SkillOption
                isActive={index === activeIndex}
                isDisabled={disabledIconIds.includes(skill.iconId)}
                key={skill.iconId}
                onHover={() => setActiveIndex(index)}
                onSelect={() => selectSkill(skill.iconId)}
                skill={skill}
              />
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
