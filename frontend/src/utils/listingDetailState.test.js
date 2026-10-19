import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getListingDetailState } from "./listingDetailState.js";

test("a shared detail URL waits for listings instead of showing a false 404", () => {
  assert.equal(getListingDetailState({ listing: null, isLoading: true, error: "" }), "loading");
  assert.equal(getListingDetailState({ listing: { id: "shared-id" }, isLoading: false, error: "" }), "ready");
});

test("failed requests are retryable errors, not missing listings", () => {
  assert.equal(getListingDetailState({ listing: null, isLoading: false, error: "Network failed" }), "error");
  assert.equal(getListingDetailState({ listing: null, isLoading: true, error: "Network failed" }), "loading");
});

test("only a successful completed request can mark a listing not found", () => {
  assert.equal(getListingDetailState({ listing: null, isLoading: false, error: "" }), "not-found");
});

test("an existing listing stays visible during refresh or refresh failure", () => {
  for (const state of [{ isLoading: true, error: "" }, { isLoading: false, error: "Network failed" }]) {
    assert.equal(getListingDetailState({ listing: { id: "shared-id" }, ...state }), "ready");
  }
});

test("the detail page uses request state and wires the retry action", () => {
  const page = readFileSync(new URL("../pages/CardInfo.jsx", import.meta.url), "utf8");
  assert.match(page, /getListingDetailState\(\{ listing: foundListing, isLoading, error \}\)/);
  assert.match(page, /onClick=\{refreshListings\}/);
  assert.match(page, /role=\{state === "error" \? "alert" : "status"\}/);
});

test("loaded listings are not deferred behind the loading completion flag", () => {
  const context = readFileSync(new URL("../context/ListingsContext.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(context, /startTransition\(\(\) => \{\s*setListings\(nextListings\)/);
});
