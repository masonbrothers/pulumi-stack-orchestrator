import type { automation } from "@pulumi/pulumi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrSelectStack: vi.fn(),
}));

vi.mock("@pulumi/pulumi", () => ({
  automation: {
    LocalWorkspace: {
      createOrSelectStack: mocks.createOrSelectStack,
    },
  },
}));

import { runStackPipeline } from "../src/run.js";

interface CreatedStack {
  readonly configCalls: automation.ConfigMap[];
  readonly destroy: ReturnType<typeof vi.fn>;
  readonly outputs: ReturnType<typeof vi.fn>;
  readonly preview: ReturnType<typeof vi.fn>;
  readonly refresh: ReturnType<typeof vi.fn>;
  readonly setAllConfig: ReturnType<typeof vi.fn>;
  readonly up: ReturnType<typeof vi.fn>;
}

describe("runStackPipeline", () => {
  beforeEach(() => {
    mocks.createOrSelectStack.mockReset();
  });

  it("runs stack steps in order and forwards prior outputs as config", async () => {
    const createdStacks: CreatedStack[] = [];
    const starts: string[] = [];
    const completes: string[] = [];

    mocks.createOrSelectStack.mockImplementation(async (stackArgs, workspaceOptions) => {
      const stack = createStack(stackArgs.stackName);
      createdStacks.push(stack);

      expect(workspaceOptions.envVars).toMatchObject({
        PULUMI_CONFIG_PASSPHRASE: "",
        PULUMI_SKIP_UPDATE_CHECK: "true",
      });

      return stack;
    });

    const results = await runStackPipeline({
      command: "down",
      envVars: {
        PULUMI_SKIP_UPDATE_CHECK: "true",
      },
      onStepComplete: (result) => {
        completes.push(`${result.command}:${result.stackName}`);
      },
      onStepStart: ({ command, stackName }) => {
        starts.push(`${command}:${stackName}`);
      },
      steps: [
        {
          projectName: "infra",
          program: async () => undefined,
          stackName: "network",
        },
        {
          config: async (outputs) => ({
            "network:outputs": {
              value: JSON.stringify(outputs),
            },
          }),
          projectName: "infra",
          program: async () => undefined,
          stackName: "apps",
        },
      ],
    });

    expect(mocks.createOrSelectStack).toHaveBeenCalledTimes(2);
    expect(createdStacks).toHaveLength(2);
    expect(createdStacks[0].destroy).toHaveBeenCalledOnce();
    expect(createdStacks[1].destroy).toHaveBeenCalledOnce();
    expect(createdStacks[1].configCalls).toEqual([
      {
        "network:outputs": {
          value: JSON.stringify({
            stack: {
              secret: false,
              value: "network",
            },
          }),
        },
      },
    ]);
    expect(starts).toEqual(["destroy:network", "destroy:apps"]);
    expect(completes).toEqual(["destroy:network", "destroy:apps"]);
    expect(results.map((result) => result.stackName)).toEqual(["network", "apps"]);
  });
});

function createStack(stackName: string): CreatedStack {
  const outputs = {
    stack: {
      secret: false,
      value: stackName,
    },
  };
  const stack: CreatedStack = {
    configCalls: [],
    destroy: vi.fn(async () => ({ kind: "destroy", stackName })),
    outputs: vi.fn(async () => outputs),
    preview: vi.fn(async () => ({ kind: "preview", stackName })),
    refresh: vi.fn(async () => ({ kind: "refresh", stackName })),
    setAllConfig: vi.fn(async (config: automation.ConfigMap) => {
      stack.configCalls.push(config);
    }),
    up: vi.fn(async () => ({ kind: "up", stackName })),
  };

  return stack;
}
