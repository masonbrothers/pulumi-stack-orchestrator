import type { automation } from "@pulumi/pulumi";

export type StackCommand = "up" | "destroy" | "preview" | "refresh";
export type CommandAlias = StackCommand | "down";
export type MaybePromise<T> = T | Promise<T>;

export type PulumiOutputs = automation.OutputMap;
export type ConfigFactory<TContext = unknown> = (
  previousOutputs: PulumiOutputs,
  context: TContext,
) => MaybePromise<automation.ConfigMap>;

export interface StackStep<TContext = unknown>
  extends Omit<automation.InlineProgramArgs, "stackName"> {
  readonly stackName: string | ((context: TContext) => string);
  readonly config?: automation.ConfigMap | ConfigFactory<TContext>;
}

export interface StackStepResult<TContext = unknown> {
  readonly command: StackCommand;
  readonly context: TContext;
  readonly index: number;
  readonly outputs: PulumiOutputs;
  readonly stack: automation.Stack;
  readonly stackName: string;
  readonly summary?: unknown;
}

export interface RunStackPipelineArgs<TContext = unknown> {
  readonly command: CommandAlias;
  readonly contexts?: readonly TContext[];
  readonly envVars?: Record<string, string>;
  readonly localWorkspaceOptions?: Omit<automation.LocalWorkspaceOptions, "envVars">;
  readonly steps: readonly StackStep<TContext>[];
  readonly onStepStart?: (event: {
    readonly command: StackCommand;
    readonly context: TContext;
    readonly index: number;
    readonly stackName: string;
  }) => void;
  readonly onStepComplete?: (
    result: StackStepResult<TContext>,
  ) => void | Promise<void>;
}
