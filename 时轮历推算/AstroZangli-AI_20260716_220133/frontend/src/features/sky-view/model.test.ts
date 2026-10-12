import assert from "node:assert/strict";
import test from "node:test";
import { annualIndex, catalogVector, DEG, equatorialToHorizontal, horizontalVector, projector, type StarRow } from "./model";

const near = (actual: number, expected: number, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("equatorial coordinates preserve east/west and place the celestial pole at local latitude", () => {
  const pole = equatorialToHorizontal([0, 0, 1], 155, 31.23);
  near(Math.asin(pole[2]) / DEG, 31.23);
  near(pole[0], 0);
  // On the equator at LST=0, RA=6h rises in the east; RA=18h sets west.
  near(equatorialToHorizontal([0, 1, 0], 0, 0)[0], 1);
  near(equatorialToHorizontal([0, -1, 0], 0, 0)[0], -1);
  near(equatorialToHorizontal([1, 0, 0], 0, 0)[2], 1);
});

test("the perspective camera looks south with east on its left and hides the rear sky", () => {
  const project = projector({ azimuth: 180, altitude: 0, fov: 65 }, 800, 600);
  const center = project(horizontalVector(180, 0))!;
  near(center.x, 400); near(center.y, 300);
  assert.ok(project(horizontalVector(135, 0))!.x < 400);
  assert.ok(project(horizontalVector(225, 0))!.x > 400);
  assert.equal(project(horizontalVector(0, 0)), null);
});

test("Polaris remains close to an independent Skyfield apparent-place reference", () => {
  // Skyfield Star at 2026-10-12 12:00 UTC, Lhasa 29.647N/91.1175E.
  // Tolerance accommodates omitted stellar aberration/parallax in the UI.
  const star: StarRow = [0, 11767, 2.530301 * 15, 89.264109, 1.97, 0.636, "Polaris", 44.22, -11.74];
  const matrix = [0.9999784314, -0.0060238976, -0.0026171471, 0.0060237943, 0.9999818557, -0.0000473202, 0.0026173847, 0.0000315541, 0.9999965741];
  const years = (Date.UTC(2026, 9, 12, 12) - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  const local = equatorialToHorizontal(catalogVector(star, matrix, years), 201.0800629 + 91.1175, 29.647);
  near(Math.asin(local[2]) / DEG, 29.3815505151, 0.03);
  near(Math.atan2(local[0], local[1]) / DEG, 0.6509859919, 0.03);
});

test("annual timeline retains leap day and maps December 31 without rolling into the next year", () => {
  assert.equal(annualIndex("2024-02-29"), 59);
  assert.equal(annualIndex("2024-12-31"), 365);
  assert.equal(annualIndex("2026-12-31"), 364);
});
