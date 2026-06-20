# pulumi-stack-orchestrator

Typed TypeScript orchestration for running several Pulumi Automation API stacks
as one deployment workflow.

This is the cleaned-up version of the old Objective Run "split Pulumi into up/down
and multiple deploys" experiment. The useful idea is preserved: one TypeScript
entrypoint can run a stack pipeline, pass outputs from one stack into the next,
and repeat that pipeline across provider/region targets.

## Install

```sh
npm install pulumi-stack-orchestrator @pulumi/pulumi
```

## Example

```ts
import {
  createMatrixContexts,
  outputsToJsonConfig,
  runStackPipeline,
  stackNameForContext,
} from "pulumi-stack-orchestrator";

const contexts = createMatrixContexts({
  stage: "prod",
  providers: ["aws"],
  regions: ["us-east-1", "us-west-2"],
});

await runStackPipeline({
  command: process.argv[2] === "down" ? "down" : "up",
  contexts,
  steps: [
    {
      projectName: "foundation",
      stackName: (context) => stackNameForContext(context, "foundation-{stage}-{region}"),
      program: async () => {
        // Define VPC, DNS, queues, etc.
        return {
          vpcId: "replace-with-pulumi-output",
        };
      },
    },
    {
      projectName: "app",
      stackName: (context) => stackNameForContext(context, "app-{stage}-{region}"),
      config: (foundationOutputs) => outputsToJsonConfig(foundationOutputs),
      program: async () => {
        // Read config produced from the previous stack and deploy the app.
      },
    },
  ],
});
```

## Commands

`runStackPipeline` accepts:

- `up`
- `down` (normalized to Pulumi Automation `destroy`)
- `destroy`
- `preview`
- `refresh`

## Design

- Stacks run sequentially within a context so dependencies are explicit.
- Contexts run sequentially by default, which is safer for state backends and
  cloud-account rate limits.
- Previous stack outputs are available to the next stack's `config` function.
- `PULUMI_CONFIG_PASSPHRASE` defaults to an empty string for local-file backend
  compatibility, and can be overridden with `envVars`.

## Publish Checklist

- Confirm the npm package name.
- Install package dependencies in a fixture or standalone checkout.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Add a real example project before the first public release if you want this
  to be more than a library helper.
