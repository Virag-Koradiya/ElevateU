import { describe, it, expect } from "@jest/globals";
import { parseSkills } from "../utils/parseSkills.js";

describe("parseSkills", () => {
  it("returns empty array when input is undefined/null/empty", () => {
    expect(parseSkills()).toEqual([]);
    expect(parseSkills(null)).toEqual([]);
    expect(parseSkills("")).toEqual([]);
  });

  it("parses a comma-separated string into trimmed array", () => {
    expect(parseSkills("React, Node,  JS ")).toEqual(["React", "Node", "JS"]);
  });

  it("trims each element in an array input", () => {
    expect(parseSkills([" React ", "Node", "  JS  "])).toEqual([
      "React",
      "Node",
      "JS",
    ]);
  });

  it("filters out empty values after trimming", () => {
    expect(parseSkills("React, , ,  Node,,")).toEqual(["React", "Node"]);
  });
});
