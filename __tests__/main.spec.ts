import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const core = { info: vi.fn(), error: vi.fn(), setFailed: vi.fn() };

const octokit = { rest: { git: { updateRef: vi.fn() } } };
const getOctokit = vi.fn(() => octokit);
const context = {
  repo: { owner: "acme", repo: "widgets" },
  sha: "1234567890abcdef",
};

const readInputs = vi.fn();
const mirrorBranch = vi.fn();
const validateSubscription = vi.fn<() => Promise<void>>();

vi.mock("@actions/core", () => core);
vi.mock("@actions/github", () => ({ getOctokit, context }));
vi.mock("../src/inputs.js", () => ({ readInputs }));
vi.mock("../src/mirror.js", () => ({ mirrorBranch }));
vi.mock("../src/subscription.js", () => ({ validateSubscription }));

const { run } = await import("../src/main.js");

beforeEach(() => {
  validateSubscription.mockResolvedValue(undefined);
  readInputs.mockReturnValue({
    targetBranch: "master",
    token: "gh-token",
    force: true,
  });
  mirrorBranch.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("run", () => {
  it("mirrors the run's own commit onto the target branch", async () => {
    await run();

    expect(mirrorBranch).toHaveBeenCalledWith(octokit, {
      owner: "acme",
      repo: "widgets",
      branch: "master",
      sha: "1234567890abcdef",
      force: true,
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("authenticates with the token from the inputs", async () => {
    await run();

    expect(getOctokit).toHaveBeenCalledWith("gh-token");
  });

  it("takes the source commit from the event context, not an input", async () => {
    // The action has no source-branch input by design; the commit always comes
    // from the run itself.
    await run();

    const request = mirrorBranch.mock.calls[0]![1];
    expect(request.sha).toBe(context.sha);
  });

  it("checks entitlement before moving anything", async () => {
    const order: string[] = [];
    validateSubscription.mockImplementation(async () => {
      order.push("subscription");
    });
    mirrorBranch.mockImplementation(async () => {
      order.push("mirror");
    });

    await run();

    expect(order).toEqual(["subscription", "mirror"]);
  });

  it("reports a rejected update with the established prefix", async () => {
    mirrorBranch.mockRejectedValue(new Error("Update is not a fast forward"));

    await run();

    // Preserved verbatim from the action this replaces; callers may match on it.
    expect(core.setFailed).toHaveBeenCalledWith(
      "Failed to update ref: Error: Update is not a fast forward",
    );
  });

  it("fails rather than throwing when an input is missing", async () => {
    readInputs.mockImplementation(() => {
      throw new Error("Input required and not supplied: token");
    });

    await expect(run()).resolves.toBeUndefined();
    expect(core.setFailed).toHaveBeenCalledWith(
      "Failed to update ref: Error: Input required and not supplied: token",
    );
    expect(mirrorBranch).not.toHaveBeenCalled();
  });

  it("does not move anything when entitlement fails", async () => {
    validateSubscription.mockRejectedValue(new Error("denied"));

    await run();

    expect(mirrorBranch).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      "Failed to update ref: Error: denied",
    );
  });

  it("passes force through when it is off", async () => {
    readInputs.mockReturnValue({
      targetBranch: "deployment",
      token: "gh-token",
      force: false,
    });

    await run();

    expect(mirrorBranch.mock.calls[0]![1]).toMatchObject({
      branch: "deployment",
      force: false,
    });
  });
});
