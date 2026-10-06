import type { SupabaseClient } from "@supabase/supabase-js";

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

type MarketPortRow = {
  id: string;
  name: string;
  country: string;
  region: string;
  specialties: string[];
  description: string;
  image_emoji: string;
  docking_capacity: number;
  danger_level: string;
};

type ComponentRow = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  price: number;
  description: string;
  compatible_with: string[];
  image_emoji: string;
  in_stock: boolean;
};

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

function toMarketPort(row: MarketPortRow): MarketPort {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    region: row.region as MarketPort["region"],
    specialties: [...row.specialties],
    description: row.description,
    imageEmoji: row.image_emoji,
    dockingCapacity: row.docking_capacity,
    dangerLevel: row.danger_level as MarketPort["dangerLevel"],
  };
}

function toComponentItem(row: ComponentRow): ComponentItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ComponentItem["category"],
    rarity: row.rarity as ComponentItem["rarity"],
    price: row.price,
    description: row.description,
    compatibleWith: [...row.compatible_with],
    imageEmoji: row.image_emoji,
    inStock: row.in_stock,
  };
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

export function createSupabaseMarketRepository(
  client: SupabaseClient,
): MarketRepository {
  return {
    async listPorts(query: PortQuery = {}) {
      let request = client.from("market_ports").select("*");
      if (query.region && query.region !== "all") {
        request = request.eq("region", query.region);
      }

      const { data, error } = await request;
      if (error) {
        throw new Error(`Unable to load market ports: ${error.message}`);
      }

      const region = query.region ?? "all";
      return (data ?? [])
        .map((row) => toMarketPort(row as MarketPortRow))
        .filter((port) => region === "all" || port.region === region)
        .filter((port) =>
          matchesText(
            [port.name, port.country, port.description, ...port.specialties],
            query.search,
          ),
        );
    },

    async listComponents(query: ComponentQuery = {}) {
      let request = client.from("components").select("*");
      if (query.category && query.category !== "all") {
        request = request.eq("category", query.category);
      }

      const { data, error } = await request;
      if (error) {
        throw new Error(`Unable to load components: ${error.message}`);
      }

      const category = query.category ?? "all";
      return (data ?? [])
        .map((row) => toComponentItem(row as ComponentRow))
        .filter((item) => category === "all" || item.category === category)
        .filter((item) =>
          matchesText(
            [item.name, item.description, item.rarity, ...item.compatibleWith],
            query.search,
          ),
        );
    },
  };
}
