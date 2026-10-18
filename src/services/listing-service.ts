import { mockListings } from "../data/mock-listings";
import { getEquipmentSkill } from "../data/equipment-skills";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
} from "../data/ship-skills";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateOfferInput,
  CreateReportInput,
  CreatedListing,
  CreateListingInput,
  EquipmentDetails,
  Listing,
  ListingCategory,
  ListingCollection,
  ListingCurrency,
  ListingQuery,
  Offer,
  ShipDetails,
  UpdateListingInput,
} from "../types/listing";
import { isNumericListingCurrency } from "../types/listing";

export interface ListingRepository {
  list(query?: ListingQuery): Promise<Listing[]>;
  get(id: string): Promise<Listing | undefined>;
  create(input: CreateListingInput): Promise<CreatedListing>;
  listOwned(ownerId: string): Promise<Listing[]>;
  updateOwned(
    listingId: string,
    ownerId: string,
    input: UpdateListingInput,
  ): Promise<Listing>;
  markSoldOwned(listingId: string, ownerId: string): Promise<Listing>;
  renewOwned(listingId: string, ownerId: string): Promise<Listing>;
  deleteOwned(listingId: string, ownerId: string): Promise<void>;
  findByEditCode(editCode: string): Promise<Listing | undefined>;
  update(editCode: string, input: UpdateListingInput): Promise<Listing>;
  markSold(editCode: string): Promise<Listing>;
  renew(editCode: string): Promise<Listing>;
  delete(editCode: string): Promise<void>;
  createOffer(listingId: string, input: CreateOfferInput): Promise<void>;
  listOffers(editCode: string): Promise<Offer[]>;
  acceptOffer(editCode: string, offerId: string): Promise<Offer>;
  declineOffer(editCode: string, offerId: string): Promise<Offer>;
  listOffersOwned(ownerId: string, listingId: string): Promise<Offer[]>;
  acceptOwnedOffer(
    ownerId: string,
    listingId: string,
    offerId: string,
  ): Promise<Offer>;
  declineOwnedOffer(
    ownerId: string,
    listingId: string,
    offerId: string,
  ): Promise<Offer>;
  countOffers(listingId: string): Promise<number>;
  report(listingId: string, input: CreateReportInput): Promise<void>;
}

export function normalizeCategory(value: string): ListingCategory | "all" {
  return value === "all" ? "all" : (value as ListingCategory);
}

export function normalizeCollection(
  value: string | null,
): ListingCollection | "all" {
  return value === "legacy" || value === "current" ? value : "all";
}

function matchesQuery(listing: Listing, search?: string) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [listing.title, listing.description, listing.seller, listing.location]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function comparePrices(
  a: Listing["price"],
  b: Listing["price"],
  ascending: boolean,
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return ascending ? a - b : b - a;
}

function generateListingEditCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function isNonnegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validateOptionalStatGroup(
  values: Array<number | undefined> | undefined,
  message: string,
  errors: Record<string, string>,
) {
  if (errors.shipDetails || !values) return;
  if (
    values.some((value) => value !== undefined && !isNonnegativeInteger(value))
  ) {
    errors.shipDetails = message;
  }
}

function validateShipDetails(
  details: ShipDetails,
  errors: Record<string, string>,
) {
  if (!["battle", "trade", "adventure"].includes(details.type)) {
    errors.shipDetails = "Choose a valid ship type.";
    return;
  }
  if (details.isTicket) {
    if (
      details.ticketNumber !== undefined &&
      (!Number.isInteger(details.ticketNumber) || details.ticketNumber <= 0)
    ) {
      errors.shipDetails = "Ticket No. must be a positive whole number.";
    }
    return;
  }
  if (
    !details.shipClass ||
    !["light", "standard", "heavy"].includes(details.shipClass)
  ) {
    errors.shipDetails = "Choose a valid ship class.";
    return;
  }
  if (details.grade !== undefined && !isNonnegativeInteger(details.grade)) {
    errors.shipDetails = "Ship grade must be a whole number of zero or more.";
    return;
  }

  validateOptionalStatGroup(
    details.performance ? Object.values(details.performance) : undefined,
    "Ship performance values must be whole numbers of zero or more.",
    errors,
  );
  validateOptionalStatGroup(
    details.improvements !== undefined ? [details.improvements] : undefined,
    "Ship improvements must be a whole number of zero or more.",
    errors,
  );
  validateOptionalStatGroup(
    details.durability !== undefined ? [details.durability] : undefined,
    "Durability must be a whole number of zero or more.",
    errors,
  );
  validateOptionalStatGroup(
    details.hold ? Object.values(details.hold) : undefined,
    "Ship hold values must be whole numbers of zero or more.",
    errors,
  );
  validateOptionalStatGroup(
    details.sailingRequirements
      ? Object.values(details.sailingRequirements)
      : undefined,
    "Sailing requirements must be whole numbers of zero or more.",
    errors,
  );
  if (errors.shipDetails) return;
  const optionalSkills = details.optionalSkills ?? [];
  if (optionalSkills.length > 5) {
    errors.shipDetails = "Choose at most five Optional ship skills.";
    return;
  }
  const skills = [details.originalSkill, ...optionalSkills].filter(
    (skill): skill is NonNullable<typeof skill> =>
      skill !== null && skill !== undefined,
  );
  if (skills.some((skill) => !skill.name.trim() || !skill.iconId.trim())) {
    errors.shipDetails = "Ship skills need both a name and icon ID.";
    return;
  }
  const optionalIconIds = new Set(
    OPTIONAL_SHIP_SKILLS.map((skill) => skill.iconId),
  );
  const originalIconIds = new Set(
    ORIGINAL_SHIP_SKILLS.map((skill) => skill.iconId),
  );
  if (
    (details.originalSkill &&
      !originalIconIds.has(details.originalSkill.iconId)) ||
    optionalSkills.some((skill) => !optionalIconIds.has(skill.iconId))
  ) {
    errors.shipDetails = "Ship skills must come from their matching game list.";
    return;
  }

  const iconIds = new Set<string>();
  for (const skill of skills) {
    if (iconIds.has(skill.iconId)) {
      errors.shipDetails = "Choose each ship skill only once.";
      return;
    }
    iconIds.add(skill.iconId);
  }
}

function validateEquipmentStatGroup(
  values: Array<number | undefined>,
  message: string,
  errors: Record<string, string>,
) {
  if (errors.equipmentDetails) return;
  if (
    values.some((value) => value !== undefined && !isNonnegativeInteger(value))
  ) {
    errors.equipmentDetails = message;
  }
}

function validateEquipmentDetails(
  details: EquipmentDetails,
  errors: Record<string, string>,
) {
  if (
    details.wearer !== undefined &&
    !["male", "female", "unisex"].includes(details.wearer)
  ) {
    errors.equipmentDetails = "Choose a valid wearer marker.";
    return;
  }

  validateEquipmentStatGroup(
    [
      details.durabilityCurrent,
      details.durabilityMax,
      details.formality,
      details.disguiseLevel,
      details.attackPower,
      details.defencePower,
    ],
    "Equipment stats must be whole numbers of zero or more.",
    errors,
  );
  if (errors.equipmentDetails) return;

  if (
    details.weaponCategory !== undefined &&
    (details.weaponCategory.trim().length === 0 ||
      details.weaponCategory.trim().length > 60)
  ) {
    errors.equipmentDetails = "Weapon Category must be 1 to 60 characters.";
    return;
  }

  const skillBonuses = details.skillBonuses ?? [];
  if (skillBonuses.length > 3) {
    errors.equipmentDetails = "Choose at most three equipment skill bonuses.";
    return;
  }
  const iconIds = new Set<string>();
  for (const bonus of skillBonuses) {
    if (!bonus.name.trim() || !bonus.iconId.trim()) {
      errors.equipmentDetails =
        "Equipment skill bonuses need both a name and icon ID.";
      return;
    }
    if (!Number.isInteger(bonus.value) || bonus.value < 1) {
      errors.equipmentDetails =
        "Equipment skill bonus values must be whole numbers of one or more.";
      return;
    }
    const record = getEquipmentSkill(bonus.iconId);
    if (!record || record.name !== bonus.name) {
      errors.equipmentDetails =
        "Equipment skill bonuses must come from the game skill list.";
      return;
    }
    if (iconIds.has(bonus.iconId)) {
      errors.equipmentDetails = "Choose each equipment skill only once.";
      return;
    }
    iconIds.add(bonus.iconId);
  }

  const effects = details.effects ?? [];
  if (effects.length > 3) {
    errors.equipmentDetails = "Add at most three Equipment Effects.";
    return;
  }
  for (const effect of effects) {
    if (!effect.name.trim()) {
      errors.equipmentDetails = "Equipment Effects need a name.";
      return;
    }
    if (
      effect.rank !== undefined &&
      (!Number.isInteger(effect.rank) || effect.rank < 1)
    ) {
      errors.equipmentDetails =
        "Equipment Effect ranks must be whole numbers of one or more.";
      return;
    }
  }

  const extraLines = details.extraLines ?? [];
  if (extraLines.length > 5) {
    errors.equipmentDetails = "Add at most five extra lines.";
    return;
  }
  for (const line of extraLines) {
    if (!line.label.trim()) {
      errors.equipmentDetails = "Extra lines need a label.";
      return;
    }
    if (line.value !== undefined && !isNonnegativeInteger(line.value)) {
      errors.equipmentDetails =
        "Extra line values must be whole numbers of zero or more.";
      return;
    }
  }
}

export function normalizeEquipmentDetails(
  details: EquipmentDetails | null | undefined,
): EquipmentDetails | null {
  if (!details) return null;
  const normalized: EquipmentDetails = {};
  if (details.wearer !== undefined) normalized.wearer = details.wearer;
  if (details.durabilityCurrent !== undefined)
    normalized.durabilityCurrent = details.durabilityCurrent;
  if (details.durabilityMax !== undefined)
    normalized.durabilityMax = details.durabilityMax;
  if (details.formality !== undefined) normalized.formality = details.formality;
  if (details.disguiseLevel !== undefined)
    normalized.disguiseLevel = details.disguiseLevel;
  if (details.attackPower !== undefined)
    normalized.attackPower = details.attackPower;
  if (details.defencePower !== undefined)
    normalized.defencePower = details.defencePower;
  const weaponCategory = details.weaponCategory?.trim();
  if (weaponCategory) normalized.weaponCategory = weaponCategory;
  if (details.skillBonuses && details.skillBonuses.length > 0) {
    normalized.skillBonuses = details.skillBonuses.map((bonus) => ({
      name: bonus.name.trim(),
      iconId: bonus.iconId.trim(),
      value: bonus.value,
    }));
  }
  if (details.effects && details.effects.length > 0) {
    normalized.effects = details.effects.map((effect) => ({
      name: effect.name.trim(),
      ...(effect.rank !== undefined ? { rank: effect.rank } : {}),
    }));
  }
  if (details.extraLines && details.extraLines.length > 0) {
    normalized.extraLines = details.extraLines.map((line) => ({
      label: line.label.trim(),
      ...(line.value !== undefined ? { value: line.value } : {}),
    }));
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function validateListingInput(input: CreateListingInput) {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < 3)
    errors.title = "Title must be at least 3 characters.";
  if (isNumericListingCurrency(input.currency)) {
    if (input.price === null) {
      errors.price = "Price is required for this currency.";
    } else if (!Number.isFinite(input.price) || input.price <= 0) {
      errors.price = "Price must be greater than zero.";
    } else if (input.currency === "CT" && !Number.isInteger(input.price)) {
      errors.price = "Captain Tickets must be a whole number.";
    }
  } else if (input.price !== null) {
    errors.currency =
      "Trade and negotiable listings cannot set a numeric price.";
  }
  if (!input.seller.trim()) errors.seller = "Seller is required.";
  if (!input.location.trim()) errors.location = "Location is required.";
  if (!input.server.trim()) errors.server = "Server is required.";
  if (input.category === "ships") {
    if (!input.shipDetails) {
      errors.shipDetails = "Ship details are required for Ships listings.";
    } else {
      validateShipDetails(input.shipDetails, errors);
    }
  } else if (input.shipDetails) {
    errors.shipDetails = "Ship details are only allowed for Ships listings.";
  }
  if (input.category === "equipment") {
    if (input.equipmentDetails) {
      validateEquipmentDetails(input.equipmentDetails, errors);
    }
  } else if (input.equipmentDetails) {
    errors.equipmentDetails =
      "Equipment details are only allowed for Equipment listings.";
  }
  return errors;
}

export function validateOfferInput(input: CreateOfferInput) {
  const errors: Record<string, string> = {};
  if (input.offererName.trim().length < 2) {
    errors.offererName = "In-game name must be at least 2 characters.";
  }
  if (isNumericListingCurrency(input.currency)) {
    if (input.amount === null) {
      errors.amount = "Amount is required for this currency.";
    } else if (!Number.isFinite(input.amount) || input.amount <= 0) {
      errors.amount = "Amount must be greater than zero.";
    }
  } else if (input.amount !== null) {
    errors.currency = "Trade and negotiable offers cannot set an amount.";
  }
  if (input.offerText.trim().length < 10) {
    errors.offerText = "Describe your offer in at least 10 characters.";
  }
  return errors;
}

export function validateReportInput(input: CreateReportInput) {
  const errors: Record<string, string> = {};
  if (input.reporterName.trim().length < 2) {
    errors.reporterName = "Reporter name must be at least 2 characters.";
  }
  if (input.details && input.details.trim().length > 1000) {
    errors.details = "Report details must be 1,000 characters or fewer.";
  }
  return errors;
}

export class ListingValidationError extends Error {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super("Listing input is invalid.");
    this.name = "ListingValidationError";
    this.errors = errors;
  }
}

export class SupabaseListingRepositoryError extends Error {
  constructor(
    operation: string,
    { code, details, hint, message }: PostgrestError,
  ) {
    const context = [
      code ? `code ${code}` : null,
      details ? `details: ${details}` : null,
      hint ? `hint: ${hint}` : null,
    ].filter(Boolean);
    const contextMessage = context.length > 0 ? ` (${context.join("; ")})` : "";

    super(`Unable to ${operation} in Supabase: ${message}${contextMessage}`, {
      cause: { code, details, hint, message },
    });
    this.name = "SupabaseListingRepositoryError";
  }
}

type ListingRow = {
  id: string;
  owner_id: string | null;
  title: string;
  category: ListingCategory;
  price: number | null;
  currency: ListingCurrency;
  description: string;
  seller: string;
  location: string;
  server: string;
  contact_note: string;
  image_emoji: string | null;
  ship_details: ShipDetails | null;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  collection: ListingCollection | null;
};

type OfferRow = {
  id: string;
  listing_id: string;
  offerer_name: string;
  contact: string;
  currency: ListingCurrency;
  amount: number | null;
  offer_text: string;
  status: Offer["status"];
  created_at: string;
};

function assertSuccessfulResponse(
  operation: string,
  error: PostgrestError | null,
) {
  if (error) {
    throw new SupabaseListingRepositoryError(operation, error);
  }
}

function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    price: row.price,
    currency: row.currency,
    description: row.description,
    seller: row.seller,
    location: row.location,
    server: row.server,
    contactNote: row.contact_note,
    imageEmoji: row.image_emoji ?? "📦",
    shipDetails: row.ship_details ?? null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    soldAt: row.sold_at,
    collection: row.collection ?? "current",
  };
}

function mapOfferRow(row: OfferRow): Offer {
  return {
    id: row.id,
    listingId: row.listing_id,
    offererName: row.offerer_name,
    contact: row.contact,
    currency: row.currency,
    amount: row.amount,
    offerText: row.offer_text,
    status: row.status,
    createdAt: row.created_at,
  };
}

function quotePostgrestFilterValue(value: string) {
  return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

function searchFilter(search: string) {
  const needle = search.trim();
  if (!needle) return null;

  // PostgREST treats commas and parentheses as filter syntax unless a value
  // containing them is quoted. Quoting keeps the user's search literal.
  const pattern = /[,"%()]/.test(needle)
    ? quotePostgrestFilterValue(`%${needle}%`)
    : `%${needle}%`;

  return [
    `title.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `seller.ilike.${pattern}`,
    `location.ilike.${pattern}`,
  ].join(",");
}

function listingRpcArguments(editCode: string, input: CreateListingInput) {
  return {
    edit_code: editCode,
    title: input.title.trim(),
    category: input.category,
    currency: input.currency,
    price: input.price,
    description: input.description.trim(),
    seller: input.seller.trim(),
    location: input.location.trim(),
    server_name: input.server.trim(),
    contact_note: input.contactNote?.trim() ?? "",
    image_url: null,
    image_emoji: input.imageEmoji ?? "📦",
    ship_details: input.shipDetails ?? null,
    collection: input.collection ?? "current",
  };
}

function ownedListingRpcArguments(input: CreateListingInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    currency: input.currency,
    price: input.price,
    description: input.description.trim(),
    seller: input.seller.trim(),
    location: input.location.trim(),
    server_name: input.server.trim(),
    contact_note: input.contactNote?.trim() ?? "",
    image_emoji: input.imageEmoji ?? "📦",
    ship_details: input.shipDetails ?? null,
    collection: input.collection ?? "current",
  };
}

function listingUpdateArguments(input: UpdateListingInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    currency: input.currency,
    price: input.price,
    description: input.description.trim(),
    seller: input.seller.trim(),
    location: input.location.trim(),
    server: input.server.trim(),
    contact_note: input.contactNote?.trim() ?? "",
    image_emoji: input.imageEmoji ?? "📦",
    ship_details: input.shipDetails ?? null,
    collection: input.collection ?? "current",
  };
}

function requireOwnedListingRow(row: ListingRow | null) {
  if (!row) throw new Error("Owned listing was not found.");
  return row;
}

export function createSupabaseListingRepository(
  client: SupabaseClient,
): ListingRepository {
  return {
    async list(query: ListingQuery = {}) {
      let request = client.from("listings").select("*");
      if (!query.includeExpired) {
        request = request.gt("expires_at", new Date().toISOString());
      }

      const category = query.category ?? "all";
      if (category !== "all") {
        request = request.eq("category", category);
      }

      const collection = query.collection ?? "all";
      if (collection === "current") {
        request = request.or("collection.eq.current,collection.is.null");
      } else if (collection === "legacy") {
        request = request.eq("collection", collection);
      }

      const filter = query.search ? searchFilter(query.search) : null;
      if (filter) {
        request = request.or(filter);
      }

      if (query.ticketsOnly) {
        request = request.eq("ship_details->>isTicket", "true");
      }

      if (query.sort === "price-asc") {
        request = request.order("price", {
          ascending: true,
          nullsFirst: false,
        });
      } else if (query.sort === "price-desc") {
        request = request.order("price", {
          ascending: false,
          nullsFirst: false,
        });
      } else {
        request = request.order("created_at", { ascending: false });
      }

      const { data, error } = await request;
      assertSuccessfulResponse("load listings", error);
      return (data ?? []).map(mapListingRow);
    },

    async get(id: string) {
      const { data, error } = await client
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      assertSuccessfulResponse("load listing", error);
      return data ? mapListingRow(data as ListingRow) : undefined;
    },

    async listOwned(ownerId: string) {
      const { data, error } = await client
        .from("listings")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

      assertSuccessfulResponse("load owned listings", error);
      return (data ?? []).map(mapListingRow);
    },

    async create(input: CreateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { data, error } = await client
        .rpc("create_owned_listing", ownedListingRpcArguments(input))
        .single();

      assertSuccessfulResponse("create listing", error);
      return mapListingRow(requireOwnedListingRow(data as ListingRow | null));
    },

    async updateOwned(
      listingId: string,
      ownerId: string,
      input: UpdateListingInput,
    ) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { data, error } = await client
        .from("listings")
        .update(listingUpdateArguments(input))
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .select("*")
        .maybeSingle();

      assertSuccessfulResponse("update owned listing", error);
      return mapListingRow(requireOwnedListingRow(data as ListingRow | null));
    },

    async markSoldOwned(listingId: string, ownerId: string) {
      const { data, error } = await client
        .from("listings")
        .update({ sold_at: new Date().toISOString() })
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .select("*")
        .maybeSingle();

      assertSuccessfulResponse("mark owned listing sold", error);
      return mapListingRow(requireOwnedListingRow(data as ListingRow | null));
    },

    async renewOwned(listingId: string, ownerId: string) {
      const { data, error } = await client
        .from("listings")
        .update({
          expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .select("*")
        .maybeSingle();

      assertSuccessfulResponse("renew owned listing", error);
      return mapListingRow(requireOwnedListingRow(data as ListingRow | null));
    },

    async deleteOwned(listingId: string, ownerId: string) {
      const { error } = await client
        .from("listings")
        .delete()
        .eq("id", listingId)
        .eq("owner_id", ownerId);

      assertSuccessfulResponse("delete owned listing", error);
    },

    async findByEditCode(editCode: string) {
      const { data, error } = await client
        .rpc("get_listing_by_edit_code", { edit_code: editCode })
        .maybeSingle();

      assertSuccessfulResponse("load listing with edit code", error);
      return data ? mapListingRow(data as ListingRow) : undefined;
    },

    async update(editCode: string, input: UpdateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { data, error } = await client
        .rpc("update_listing", listingRpcArguments(editCode, input))
        .single();

      assertSuccessfulResponse("update listing", error);
      return mapListingRow(data as ListingRow);
    },

    async markSold(editCode: string) {
      const { data, error } = await client
        .rpc("mark_listing_sold", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("mark listing sold", error);
      return mapListingRow(data as ListingRow);
    },

    async renew(editCode: string) {
      const { data, error } = await client
        .rpc("renew_listing", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("renew listing", error);
      return mapListingRow(data as ListingRow);
    },

    async delete(editCode: string) {
      const { data, error } = await client
        .rpc("delete_listing", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("delete listing", error);
      if (!data) throw new Error("Listing edit code not found.");
    },

    async createOffer(listingId: string, input: CreateOfferInput) {
      const errors = validateOfferInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { error } = await client.from("offers").insert({
        listing_id: listingId,
        offerer_name: input.offererName.trim(),
        contact: input.contact?.trim() ?? "",
        currency: input.currency,
        amount: input.amount,
        offer_text: input.offerText.trim(),
      });
      assertSuccessfulResponse("create offer", error);
    },

    async listOffers(editCode: string) {
      const { data, error } = await client.rpc("list_listing_offers", {
        edit_code: editCode,
      });

      assertSuccessfulResponse("load listing offers", error);
      return (data as OfferRow[]).map(mapOfferRow);
    },

    async acceptOffer(editCode: string, offerId: string) {
      const { data, error } = await client
        .rpc("accept_listing_offer", {
          edit_code: editCode,
          offer_id: offerId,
        })
        .single();

      assertSuccessfulResponse("accept offer", error);
      return mapOfferRow(data as OfferRow);
    },

    async declineOffer(editCode: string, offerId: string) {
      const { data, error } = await client
        .rpc("decline_listing_offer", {
          edit_code: editCode,
          offer_id: offerId,
        })
        .single();

      assertSuccessfulResponse("decline offer", error);
      return mapOfferRow(data as OfferRow);
    },

    async listOffersOwned(ownerId: string, listingId: string) {
      const { data: ownedListing, error: listingError } = await client
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .maybeSingle();

      assertSuccessfulResponse("load owned listing for offers", listingError);
      requireOwnedListingRow(ownedListing as ListingRow | null);

      const { data, error } = await client
        .from("offers")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      assertSuccessfulResponse("load owned listing offers", error);
      return (data ?? []).map((row) => mapOfferRow(row as OfferRow));
    },

    async acceptOwnedOffer(
      ownerId: string,
      listingId: string,
      offerId: string,
    ) {
      const { data: ownedListing, error: listingError } = await client
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .maybeSingle();

      assertSuccessfulResponse(
        "load owned listing for offer update",
        listingError,
      );
      requireOwnedListingRow(ownedListing as ListingRow | null);

      const { data, error } = await client
        .from("offers")
        .update({ status: "accepted" })
        .eq("id", offerId)
        .eq("listing_id", listingId)
        .select("*")
        .maybeSingle();

      assertSuccessfulResponse("accept owned listing offer", error);
      if (!data) throw new Error("Owned listing offer was not found.");
      return mapOfferRow(data as OfferRow);
    },

    async declineOwnedOffer(
      ownerId: string,
      listingId: string,
      offerId: string,
    ) {
      const { data: ownedListing, error: listingError } = await client
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("owner_id", ownerId)
        .maybeSingle();

      assertSuccessfulResponse(
        "load owned listing for offer update",
        listingError,
      );
      requireOwnedListingRow(ownedListing as ListingRow | null);

      const { data, error } = await client
        .from("offers")
        .update({ status: "declined" })
        .eq("id", offerId)
        .eq("listing_id", listingId)
        .select("*")
        .maybeSingle();

      assertSuccessfulResponse("decline owned listing offer", error);
      if (!data) throw new Error("Owned listing offer was not found.");
      return mapOfferRow(data as OfferRow);
    },

    async countOffers(listingId: string) {
      const { data, error } = await client
        .rpc("listing_offer_count", { listing_id: listingId })
        .single();

      assertSuccessfulResponse("count listing offers", error);
      return Number(data);
    },

    async report(listingId: string, input: CreateReportInput) {
      const errors = validateReportInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { error } = await client.from("reports").insert({
        listing_id: listingId,
        reporter_name: input.reporterName.trim(),
        reason: input.reason,
        details: input.details?.trim() ?? "",
      });
      assertSuccessfulResponse("report listing", error);
    },
  };
}

export function createLocalListingRepository(
  initialListings: Listing[] = mockListings,
): ListingRepository {
  const listings = [...initialListings];
  const editCodes = new Map<string, string>();
  const offers: Offer[] = [];

  return {
    async list(query: ListingQuery = {}) {
      const category = query.category ?? "all";
      const collection = query.collection ?? "all";
      let results = listings.filter(
        (listing) =>
          (query.includeExpired ||
            new Date(listing.expiresAt).getTime() > Date.now()) &&
          (category === "all" || listing.category === category) &&
          (collection === "all" ||
            (listing.collection ?? "current") === collection) &&
          (!query.ticketsOnly || listing.shipDetails?.isTicket === true) &&
          matchesQuery(listing, query.search),
      );

      if (query.sort === "price-asc") {
        results = [...results].sort((a, b) =>
          comparePrices(a.price, b.price, true),
        );
      } else if (query.sort === "price-desc") {
        results = [...results].sort((a, b) =>
          comparePrices(a.price, b.price, false),
        );
      } else {
        results = [...results].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
      }

      return results.map((listing) => ({ ...listing }));
    },

    async get(id: string) {
      const listing = listings.find((item) => item.id === id);
      return listing ? { ...listing } : undefined;
    },

    async listOwned(ownerId: string) {
      return listings
        .filter((listing) => listing.ownerId === ownerId)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((listing) => ({ ...listing }));
    },

    async create(input: CreateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const listing: Listing = {
        ...input,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `listing-${Date.now()}`,
        currency: input.currency,
        imageEmoji: input.imageEmoji ?? "📦",
        shipDetails: input.shipDetails ?? null,
        equipmentDetails: normalizeEquipmentDetails(input.equipmentDetails),
        server: input.server.trim(),
        contactNote: input.contactNote?.trim() ?? "",
        collection: input.collection ?? "current",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      const editCode = generateListingEditCode();
      listings.unshift(listing);
      editCodes.set(listing.id, editCode);
      return { ...listing, editCode };
    },

    async findByEditCode(editCode: string) {
      const listing = listings.find(
        (item) => editCodes.get(item.id) === editCode,
      );
      return listing ? { ...listing } : undefined;
    },

    async updateOwned(
      listingId: string,
      ownerId: string,
      input: UpdateListingInput,
    ) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const index = listings.findIndex(
        (listing) => listing.id === listingId && listing.ownerId === ownerId,
      );
      if (index === -1) throw new Error("Owned listing was not found.");

      listings[index] = {
        ...listings[index],
        ...input,
        price: input.price,
        currency: input.currency,
        title: input.title.trim(),
        description: input.description.trim(),
        seller: input.seller.trim(),
        location: input.location.trim(),
        server: input.server.trim(),
        contactNote: input.contactNote?.trim() ?? "",
        imageEmoji: input.imageEmoji ?? "📦",
        shipDetails: input.shipDetails ?? null,
        equipmentDetails: normalizeEquipmentDetails(input.equipmentDetails),
        collection: input.collection ?? "current",
      };
      return { ...listings[index] };
    },

    async markSoldOwned(listingId: string, ownerId: string) {
      const index = listings.findIndex(
        (listing) => listing.id === listingId && listing.ownerId === ownerId,
      );
      if (index === -1) throw new Error("Owned listing was not found.");

      listings[index] = {
        ...listings[index],
        soldAt: listings[index].soldAt ?? new Date().toISOString(),
      };
      return { ...listings[index] };
    },

    async renewOwned(listingId: string, ownerId: string) {
      const index = listings.findIndex(
        (listing) => listing.id === listingId && listing.ownerId === ownerId,
      );
      if (index === -1) throw new Error("Owned listing was not found.");

      listings[index] = {
        ...listings[index],
        expiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      return { ...listings[index] };
    },

    async deleteOwned(listingId: string, ownerId: string) {
      const index = listings.findIndex(
        (listing) => listing.id === listingId && listing.ownerId === ownerId,
      );
      if (index === -1) throw new Error("Owned listing was not found.");

      const [listing] = listings.splice(index, 1);
      editCodes.delete(listing.id);
    },

    async update(editCode: string, input: UpdateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        ...input,
        price: input.price,
        currency: input.currency,
        title: input.title.trim(),
        description: input.description.trim(),
        seller: input.seller.trim(),
        location: input.location.trim(),
        server: input.server.trim(),
        contactNote: input.contactNote?.trim() ?? "",
        imageEmoji: input.imageEmoji ?? "📦",
        shipDetails: input.shipDetails ?? null,
        equipmentDetails: normalizeEquipmentDetails(input.equipmentDetails),
        collection: input.collection ?? "current",
      };
      return { ...listings[index] };
    },

    async markSold(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        soldAt: listings[index].soldAt ?? new Date().toISOString(),
      };
      return { ...listings[index] };
    },

    async renew(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        expiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      return { ...listings[index] };
    },

    async delete(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      const [listing] = listings.splice(index, 1);
      editCodes.delete(listing.id);
    },

    async createOffer(listingId: string, input: CreateOfferInput) {
      const errors = validateOfferInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }
      if (!listings.some((listing) => listing.id === listingId)) {
        throw new Error("Listing not found.");
      }

      offers.unshift({
        id: crypto.randomUUID(),
        listingId,
        offererName: input.offererName.trim(),
        contact: input.contact?.trim() ?? "",
        currency: input.currency,
        amount: input.amount,
        offerText: input.offerText.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    },

    async listOffers(editCode: string) {
      const listing = listings.find(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (!listing) throw new Error("Listing edit code not found.");

      return offers
        .filter((offer) => offer.listingId === listing.id)
        .map((offer) => ({ ...offer }));
    },

    async acceptOffer(editCode: string, offerId: string) {
      const listing = listings.find(
        (item) => editCodes.get(item.id) === editCode,
      );
      const index = offers.findIndex(
        (offer) => offer.id === offerId && offer.listingId === listing?.id,
      );
      if (!listing || index === -1) {
        throw new Error("Listing edit code or offer was not found.");
      }

      offers[index] = { ...offers[index], status: "accepted" };
      return { ...offers[index] };
    },

    async declineOffer(editCode: string, offerId: string) {
      const listing = listings.find(
        (item) => editCodes.get(item.id) === editCode,
      );
      const index = offers.findIndex(
        (offer) => offer.id === offerId && offer.listingId === listing?.id,
      );
      if (!listing || index === -1) {
        throw new Error("Listing edit code or offer was not found.");
      }

      offers[index] = { ...offers[index], status: "declined" };
      return { ...offers[index] };
    },

    async listOffersOwned(ownerId: string, listingId: string) {
      const listing = listings.find(
        (item) => item.id === listingId && item.ownerId === ownerId,
      );
      if (!listing) throw new Error("Owned listing was not found.");

      return offers
        .filter((offer) => offer.listingId === listing.id)
        .map((offer) => ({ ...offer }));
    },

    async acceptOwnedOffer(
      ownerId: string,
      listingId: string,
      offerId: string,
    ) {
      const listing = listings.find(
        (item) => item.id === listingId && item.ownerId === ownerId,
      );
      const index = offers.findIndex(
        (offer) => offer.id === offerId && offer.listingId === listing?.id,
      );
      if (!listing || index === -1) {
        throw new Error("Owned listing or offer was not found.");
      }

      offers[index] = { ...offers[index], status: "accepted" };
      return { ...offers[index] };
    },

    async declineOwnedOffer(
      ownerId: string,
      listingId: string,
      offerId: string,
    ) {
      const listing = listings.find(
        (item) => item.id === listingId && item.ownerId === ownerId,
      );
      const index = offers.findIndex(
        (offer) => offer.id === offerId && offer.listingId === listing?.id,
      );
      if (!listing || index === -1) {
        throw new Error("Owned listing or offer was not found.");
      }

      offers[index] = { ...offers[index], status: "declined" };
      return { ...offers[index] };
    },

    async countOffers(listingId: string) {
      return offers.filter((offer) => offer.listingId === listingId).length;
    },

    async report(listingId: string, input: CreateReportInput) {
      const errors = validateReportInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }
      if (!listings.some((listing) => listing.id === listingId)) {
        throw new Error("Listing not found.");
      }
    },
  };
}
