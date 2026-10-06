import { getSupabaseClient } from "./supabase-client";

export const LISTING_IMAGE_BUCKET = "listing-images";
export const LISTING_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const imageExtensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function validateListingImage(file: File): string | null {
  if (!LISTING_IMAGE_MIME_TYPES.includes(file.type as "image/png")) {
    return "Images must be PNG, JPEG, or WebP.";
  }
  if (file.size <= 0) {
    return "Image files cannot be empty.";
  }
  if (file.size > LISTING_IMAGE_MAX_BYTES) {
    return "Images must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadListingImage(file: File): Promise<string> {
  const validationError = validateListingImage(file);
  if (validationError) throw new Error(validationError);

  const client = getSupabaseClient();
  if (!client) return URL.createObjectURL(file);

  const extension = imageExtensions[file.type];
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `listings/${uniqueId}.${extension}`;
  const { error } = await client.storage
    .from(LISTING_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload listing image: ${error.message}`);
  }

  const { data } = client.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
