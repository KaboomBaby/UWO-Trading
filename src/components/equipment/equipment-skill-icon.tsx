import { useState } from "react";

import { equipmentSkillIconUrl } from "../../data/equipment-skills";

/**
 * The game's icon for an equipment skill, self-hosted under
 * public/equipment-skill-icons. A few skills have no extracted icon yet;
 * if the file is missing the image hides itself instead of showing a
 * broken-image glyph, leaving the skill name to carry the row.
 */
export function EquipmentSkillIcon({
  iconId,
  className = "h-8 w-8 rounded-md border border-white/15 bg-black/30 object-contain",
}: {
  iconId: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      alt=""
      className={className}
      onError={() => setFailed(true)}
      src={equipmentSkillIconUrl(iconId)}
    />
  );
}
