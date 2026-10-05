import { mockComponents, mockPorts } from "../data/mock-market";
import type {
  ComponentCategory,
  ComponentItem,
  ComponentQuery,
  MarketPort,
  PortQuery,
  PortRegion,
} from "../types/market";
import { COMPONENT_CATEGORIES, PORT_REGIONS } from "../types/market";

export interface MarketRepository {
  listPorts(query?: PortQuery): Promise<MarketPort[]>;
  listComponents(query?: ComponentQuery): Promise<ComponentItem[]>;
}

export function normalizePortRegion(value: string | null): PortRegion | "all" {
  return PORT_REGIONS.includes(value as PortRegion)
    ? (value as PortRegion)
    : "all";
}

export function normalizeComponentCategory(
  value: string | null,
): ComponentCategory | "all" {
  return COMPONENT_CATEGORIES.includes(value as ComponentCategory)
    ? (value as ComponentCategory)
    : "all";
}

function matchesText(parts: string[], search?: string) {
  if (!search?.trim()) return true;
  return parts.join(" ").toLowerCase().includes(search.trim().toLowerCase());
}

export function createLocalMarketRepository(): MarketRepository {
  return {
    async listPorts(query: PortQuery = {}) {
      const region = query.region ?? "all";
      return mockPorts
        .filter((port) => region === "all" || port.region === region)
        .filter((port) =>
          matchesText(
            [port.name, port.country, port.description, ...port.specialties],
            query.search,
          ),
        )
        .map((port) => ({ ...port, specialties: [...port.specialties] }));
    },

    async listComponents(query: ComponentQuery = {}) {
      const category = query.category ?? "all";
      return mockComponents
        .filter((item) => category === "all" || item.category === category)
        .filter((item) =>
          matchesText(
            [item.name, item.description, item.rarity, ...item.compatibleWith],
            query.search,
          ),
        )
        .map((item) => ({
          ...item,
          compatibleWith: [...item.compatibleWith],
        }));
    },
  };
}
