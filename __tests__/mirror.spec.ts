import { beforeEach, describe, expect, it, vi } from "vitest";
import { type RefUpdater, mirrorBranch, refFor } from "../src/mirror.js";

const updateRef = vi.fn();
const client: RefUpdater = { rest: { git: { updateRef } } };

beforeEach(() => {
  updateRef.mockReset();
  updateRef.mockResolvedValue({ status: 200 });
});

describe("refFor", () => {
  it("uses the short form the git refs API expects", () => {
    // Not `refs/heads/master`: the endpoint puts the ref in the path after
    // `/git/refs/`, and passing the fully qualified form addresses
    // `refs/refs/heads/master`, which does not exist.
    expect(refFor("master")).toBe("heads/master");
  });

  it("passes a branch containing slashes through unchanged", () => {
    expect(refFor("release/2024")).toBe("heads/release/2024");
  });
});

describe("mirrorBranch", () => {
  const request = {
    owner: "acme",
    repo: "widgets",
    branch: "master",
    sha: "c0ffee",
    force: true,
  };

  it("moves the target branch to the given commit", async () => {
    await mirrorBranch(client, request);

    expect(updateRef).toHaveBeenCalledWith({
      owner: "acme",
      repo: "widgets",
      ref: "heads/master",
      sha: "c0ffee",
      force: true,
    });
  });

  it("forwards force unchanged rather than defaulting it", async () => {
    await mirrorBranch(client, { ...request, force: false });

    expect(updateRef.mock.calls[0]![0]).toMatchObject({ force: false });
  });

  it("makes exactly one API call", async () => {
    await mirrorBranch(client, request);

    expect(updateRef).toHaveBeenCalledTimes(1);
  });

  it("propagates a rejection so the caller can fail the step", async () => {
    // This is how a non-fast-forward update surfaces when force is off. It
    // must not be swallowed, or the action would report success having moved
    // nothing.
    updateRef.mockRejectedValue(new Error("Update is not a fast forward"));

    await expect(mirrorBranch(client, request)).rejects.toThrow(
      "Update is not a fast forward",
    );
  });
});
