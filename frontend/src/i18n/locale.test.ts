import assert from "node:assert/strict";
import test from "node:test";
import { localeFromPath, localizePath } from "./locale";

test("localeFromPath resolves Tibetan-prefixed routes only", () => {
  assert.equal(localeFromPath("/bo/cal"), "bo");
  assert.equal(localeFromPath("/bo"), "bo");
  assert.equal(localeFromPath("/cal"), "zh");
  assert.equal(localeFromPath("/books"), "zh");
});

test("localizePath preserves the route and query when adding the Tibetan prefix", () => {
  assert.equal(localizePath("bo", "/earth?tab=five-elements"), "/bo/earth?tab=five-elements");
  assert.equal(localizePath("bo", "/"), "/bo");
  assert.equal(localizePath("zh", "/earth?tab=zodiac"), "/earth?tab=zodiac");
  assert.equal(localizePath("zh", "/"), "/zh");
});

test("localizePath does not duplicate an existing locale prefix", () => {
  assert.equal(localizePath("bo", "/bo/earth"), "/bo/earth");
  assert.equal(localizePath("zh", "/bo/earth"), "/earth");
  assert.equal(localizePath("bo", "https://example.org/help"), "https://example.org/help");
});
