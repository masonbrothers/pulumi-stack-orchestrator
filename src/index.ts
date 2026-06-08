export {
  createMatrixContexts,
  mergeConfig,
  normalizeCommand,
  outputsToJsonConfig,
  stackNameForContext,
  type CreateMatrixContextsArgs,
  type ConfigMapLike,
  type MatrixContext,
  type OutputMapLike,
  type OutputValueLike,
} from "./pure.js";

export { runStackPipeline } from "./run.js";

export type {
  CommandAlias,
  ConfigFactory,
  MaybePromise,
  PulumiOutputs,
  RunStackPipelineArgs,
  StackCommand,
  StackStep,
  StackStepResult,
} from "./types.js";
