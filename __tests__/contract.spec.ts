import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the interface callers depend on.
 *
 * This is a drop-in replacement, so `action.yml` is fixed by the action it
 * replaces. A renamed input or a changed default would break callers who
 * swapped us in, and no test of the implementation would catch it.
 */
const manifest = readFileSync(
  fileURLToPath(new URL("../action.yml", import.meta.url)),
  "utf8",
);

const inputsBlock = manifest.split(/^inputs:$/m)[1]!.split(/^runs:$/m)[0]!;

describe("action.yml", () => {
  it("declares exactly the three expected inputs", () => {
    const inputs = inputsBlock
      .split("\n")
      .filter((line) => /^ {2}\S+:/.test(line))
      .map((line) => line.trim().replace(/:$/, ""));

    expect(inputs).toEqual(["target-branch", "token", "force"]);
  });

  it("defaults target-branch to master", () => {
    expect(inputsBlock).toMatch(
      /target-branch:[\s\S]*?default: ['"]master['"]/,
    );
  });

  it("defaults force to true", () => {
    // Surprising but load-bearing: the action this replaces force pushes
    // unless told otherwise, and changing that would silently start failing
    // workflows that rely on it.
    expect(inputsBlock).toMatch(/force:[\s\S]*?default: ['"]true['"]/);
  });

  it("defaults token to the workflow's own token", () => {
    expect(inputsBlock).toMatch(
      /token:[\s\S]*?default: \$\{\{ github\.token \}\}/,
    );
  });

  it("leaves every input optional", () => {
    expect(inputsBlock).not.toMatch(/required: true/);
  });

  it("declares no outputs", () => {
    expect(manifest).not.toMatch(/^outputs:$/m);
  });

  it("runs the committed bundle on node24", () => {
    // The runtime installs nothing, so the entrypoint has to be the
    // self-contained bundle rather than a source file with bare imports.
    expect(manifest).toMatch(/using: ['"]node24['"]/);
    expect(manifest).toMatch(/main: ['"]dist\/index\.js['"]/);
  });
});
