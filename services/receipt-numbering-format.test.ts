import { describe, it, expect } from "vitest";

describe("Receipt Number Formatting", () => {
  // This tests the String.padStart(4, "0") behavior which is used in both local and Supabase

  it("should pad 1 to 0001", () => {
    expect(String(1).padStart(4, "0")).toBe("0001");
  });

  it("should pad 487 to 0487", () => {
    expect(String(487).padStart(4, "0")).toBe("0487");
  });

  it("should keep 9999 as 9999", () => {
    expect(String(9999).padStart(4, "0")).toBe("9999");
  });

  it("should NOT pad 10000 (minimum 4 digits, no max)", () => {
    expect(String(10000).padStart(4, "0")).toBe("10000");
  });

  it("should pad 0 to 0000", () => {
    expect(String(0).padStart(4, "0")).toBe("0000");
  });

  it("should handle large numbers", () => {
    expect(String(123456).padStart(4, "0")).toBe("123456");
  });
});