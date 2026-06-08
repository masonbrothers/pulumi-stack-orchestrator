import type { CommandAlias, StackCommand } from "./types.js";

export interface OutputValueLike {
  readonly value: unknown;
  readonly secret: boolean;
}

export type OutputMapLike = Record<string, OutputValueLike>;

export type ConfigMapLike = Record<
  string,
  {
    readonly value: string;
    readonly secret?: boolean;
  }
>;

export interface MatrixContext {
  readonly stage: string;
  readonly provider: string;
  readonly region: string;
}

export interface CreateMatrixContextsArgs {
  readonly stage: string;
  readonly providers: readonly string[];
  readonly regions: readonly string[];
}

export function normalizeCommand(command: CommandAlias): StackCommand {
  return command === "down" ? "destroy" : command;
}

export function stackNameForContext(
  context: MatrixContext,
  template = "{stage}-{provider}-{region}",
): string {
  return template
    .replaceAll("{stage}", context.stage)
    .replaceAll("{provider}", context.provider)
    .replaceAll("{region}", context.region);
}

export function createMatrixContexts(
  args: CreateMatrixContextsArgs,
): MatrixContext[] {
  return args.providers.flatMap((provider) =>
    args.regions.map((region) => ({
      stage: args.stage,
      provider,
      region,
    })),
  );
}

export function outputsToJsonConfig(outputs: OutputMapLike): ConfigMapLike {
  return Object.fromEntries(
    Object.entries(outputs).map(([key, output]) => [
      key,
      {
        secret: output.secret,
        value: JSON.stringify(output.value),
      },
    ]),
  );
}

export function mergeConfig(
  left: ConfigMapLike,
  right: ConfigMapLike | undefined,
): ConfigMapLike {
  return {
    ...left,
    ...(right ?? {}),
  };
}
