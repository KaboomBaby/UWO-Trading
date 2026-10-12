import { describe, expect, it } from "vitest";

type NodeFileSystem = {
  readFile(filename: string, options: { encoding: "utf8" }): Promise<string>;
};

async function loadNodeFileSystem(): Promise<NodeFileSystem> {
  // The browser tsconfig intentionally omits @types/node, while Vitest supplies
  // this builtin at runtime.
  // @ts-expect-error node:fs/promises has no declaration in this tsconfig
  return import("node:fs/promises");
}

const { readFile } = await loadNodeFileSystem();
const script = await readFile("scripts/verify-supabase-roundtrip.mjs", {
  encoding: "utf8",
});

describe("Supabase owner roundtrip verification script", () => {
  it("requires and signs in with dedicated test-account credentials", () => {
    expect(script).toContain("SUPABASE_TEST_EMAIL");
    expect(script).toContain("SUPABASE_TEST_PASSWORD");
    expect(script).toContain("signInWithPassword");
    expect(script).toContain("email_not_confirmed");
    expect(script).toContain("has not confirmed its email address");
  });

  it("exercises the owned account lifecycle without legacy edit-code mutation", () => {
    expect(script).toContain("created.ownerId !== ownerId");
    expect(script).toContain("created.editCode !== undefined");
    expect(script).toContain("repository.listOwned(ownerId)");
    expect(script).toContain("repository.updateOwned(created.id, ownerId");
    expect(script).toContain("repository.markSoldOwned(created.id, ownerId)");
    expect(script).toContain("repository.renewOwned(created.id, ownerId)");
    expect(script).toContain("client.auth.signOut()");
    expect(script).toContain("repository.createOffer(created.id");
    expect(script).toContain("repository.listOffersOwned(ownerId, created.id)");
    expect(script).toContain("repository.acceptOwnedOffer(");
    expect(script).toContain("repository.report(created.id");
    expect(script).toContain("repository.deleteOwned(created.id, ownerId)");
    expect(script).toContain("repository.get(created.id)");

    expect(script).not.toContain("repository.update(created.editCode");
    expect(script).not.toContain("repository.delete(created.editCode");
  });

  it("restores the public listing baseline after cleanup", () => {
    expect(script).toContain("const before = await listingState();");
    expect(script).toContain("const after = await listingState();");
    expect(script).toContain("after.count !== before.count");
    expect(script).toContain("isDeleted = true");
    expect(script).toContain("Cleanup failed:");
  });
});
