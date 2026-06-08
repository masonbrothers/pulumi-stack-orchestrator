import {
  createMatrixContexts,
  normalizeCommand,
  outputsToJsonConfig,
  stackNameForContext,
} from "../src/pure.js";
import { describe, expect, it } from "vitest";

describe("Pulumi stack orchestration pure helpers", () => {
  it("normalizes down to Pulumi Automation destroy", () => {
    expect(normalizeCommand("down")).toBe("destroy");
    expect(normalizeCommand("up")).toBe("up");
  });

  it("creates provider/region deployment contexts", () => {
    expect(
      createMatrixContexts({
        stage: "prod",
        providers: ["aws", "gcp"],
        regions: ["us-east-1", "us-west-2"],
      }),
    ).toEqual([
      { stage: "prod", provider: "aws", region: "us-east-1" },
      { stage: "prod", provider: "aws", region: "us-west-2" },
      { stage: "prod", provider: "gcp", region: "us-east-1" },
      { stage: "prod", provider: "gcp", region: "us-west-2" },
    ]);
  });

  it("formats stack names from deployment context", () => {
    expect(
      stackNameForContext({
        stage: "dev",
        provider: "aws",
        region: "ca-west-1",
      }),
    ).toBe("dev-aws-ca-west-1");
    expect(
      stackNameForContext(
        { stage: "dev", provider: "aws", region: "ca-west-1" },
        "{provider}/{stage}/{region}",
      ),
    ).toBe("aws/dev/ca-west-1");
  });

  it("turns previous outputs into JSON Pulumi config", () => {
    expect(
      outputsToJsonConfig({
        db: {
          secret: true,
          value: {
            host: "db.example.test",
            port: 5432,
          },
        },
        replicas: {
          secret: false,
          value: 3,
        },
      }),
    ).toEqual({
      db: {
        secret: true,
        value: "{\"host\":\"db.example.test\",\"port\":5432}",
      },
      replicas: {
        secret: false,
        value: "3",
      },
    });
  });
});
