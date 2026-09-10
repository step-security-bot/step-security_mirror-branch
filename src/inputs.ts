import * as core from "@actions/core";

export interface Inputs {
  /** Branch to move, without the `refs/heads/` prefix. */
  targetBranch: string;
  /** Token used to authenticate against the GitHub API. */
  token: string;
  /** Whether the target branch may be moved to a commit that is not a descendant of its current one. */
  force: boolean;
}

/**
 * Interprets the `force` input.
 *
 * Only the word `true`, in any casing, enables force pushing. Everything else,
 * including a blank value and a misspelling, disables it. That is deliberately
 * lenient in the safe direction: `force` decides whether commits on the target
 * branch can be discarded, so an unrecognised value must never be read as
 * permission to discard them.
 */
export function parseForce(raw: string): boolean {
  return raw.toUpperCase() === "TRUE";
}

/**
 * Reads the action inputs.
 *
 * `target-branch` and `token` are both marked required here even though
 * `action.yml` gives them defaults. The defaults mean they are normally
 * present, so this only fires when a caller explicitly passes an empty value,
 * where failing is far better than mirroring onto a branch named "".
 */
export function readInputs(): Inputs {
  return {
    targetBranch: core.getInput("target-branch", { required: true }),
    token: core.getInput("token", { required: true }),
    force: parseForce(core.getInput("force")),
  };
}
