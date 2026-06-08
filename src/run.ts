import { automation } from "@pulumi/pulumi";

import { mergeConfig, normalizeCommand } from "./pure.js";
import type {
  PulumiOutputs,
  RunStackPipelineArgs,
  StackCommand,
  StackStep,
  StackStepResult,
} from "./types.js";

export async function runStackPipeline<TContext = unknown>(
  args: RunStackPipelineArgs<TContext>,
): Promise<StackStepResult<TContext>[]> {
  const command = normalizeCommand(args.command);
  const contexts = args.contexts?.length
    ? args.contexts
    : ([undefined] as TContext[]);
  const results: StackStepResult<TContext>[] = [];

  for (const context of contexts) {
    let previousOutputs: PulumiOutputs = {};

    for (const [index, step] of args.steps.entries()) {
      const stackName = resolveStackName(step, context);
      args.onStepStart?.({ command, context, index, stackName });

      const stack = await automation.LocalWorkspace.createOrSelectStack(
        {
          ...step,
          stackName,
        },
        {
          ...args.localWorkspaceOptions,
          envVars: {
            PULUMI_CONFIG_PASSPHRASE: "",
            ...(args.envVars ?? {}),
          },
        },
      );

      const config = await resolveConfig(step, previousOutputs, context);
      if (Object.keys(config).length > 0) {
        await stack.setAllConfig(config);
      }

      const summary = await runCommand(command, stack);
      const outputs =
        command === "preview" ? previousOutputs : await stack.outputs();

      const result = {
        command,
        context,
        index,
        outputs,
        stack,
        stackName,
        summary,
      } satisfies StackStepResult<TContext>;

      results.push(result);
      previousOutputs = outputs;
      await args.onStepComplete?.(result);
    }
  }

  return results;
}

function resolveStackName<TContext>(
  step: StackStep<TContext>,
  context: TContext,
): string {
  return typeof step.stackName === "function"
    ? step.stackName(context)
    : step.stackName;
}

async function resolveConfig<TContext>(
  step: StackStep<TContext>,
  previousOutputs: PulumiOutputs,
  context: TContext,
): Promise<automation.ConfigMap> {
  if (!step.config) {
    return {};
  }

  if (typeof step.config === "function") {
    return mergeConfig({}, await step.config(previousOutputs, context));
  }

  return mergeConfig({}, step.config);
}

async function runCommand(command: StackCommand, stack: any): Promise<unknown> {
  switch (command) {
    case "up":
      return stack.up();
    case "destroy":
      return stack.destroy();
    case "preview":
      return stack.preview();
    case "refresh":
      return stack.refresh();
  }
}
