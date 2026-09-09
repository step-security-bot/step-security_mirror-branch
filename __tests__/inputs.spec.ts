import { describe, expect, it, vi } from "vitest";

const core = { getInput: vi.fn<(name: string, options?: unknown) => string>() };
vi.mock("@actions/core", () => core);

const { parseForce, readInputs } = await import("../src/inputs.js");

describe("parseForce", () => {
  it("enables force for the word true, whatever the casing", () => {
    for (const raw of ["true", "TRUE", "True", "tRuE"]) {
      expect(parseForce(raw)).toBe(true);
    }
  });

  it("disables force for the word false", () => {
    for (const raw of ["false", "FALSE", "False"]) {
      expect(parseForce(raw)).toBe(false);
    }
  });

  it("disables force for a blank value", () => {
    // action.yml defaults this to "true", so blank only happens when a caller
    // explicitly passes nothing, and the safe reading is not to force.
    expect(parseForce("")).toBe(false);
  });

  it("disables force for anything it does not recognise", () => {
    // Notably "yes" and "1" do not enable it. Force can discard commits, so an
    // unrecognised value must never be taken as permission to do that.
    for (const raw of ["yes", "1", "on", "truthy", "  true  ", "y"]) {
      expect(parseForce(raw)).toBe(false);
    }
  });
});

describe("readInputs", () => {
  it("reads the three declared inputs", () => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case "target-branch":
          return "master";
        case "token":
          return "gh-token";
        case "force":
          return "true";
        default:
          throw new Error(`unexpected input ${name}`);
      }
    });

    expect(readInputs()).toEqual({
      targetBranch: "master",
      token: "gh-token",
      force: true,
    });
  });

  it("insists on a branch and a token", () => {
    core.getInput.mockReturnValue("x");
    readInputs();

    expect(core.getInput).toHaveBeenCalledWith("target-branch", {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith("token", { required: true });
  });

  it("does not insist on force, which has a usable default", () => {
    core.getInput.mockReturnValue("x");
    readInputs();

    expect(core.getInput).toHaveBeenCalledWith("force");
  });
});
