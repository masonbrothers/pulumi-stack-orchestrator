const { spawnSync } = require("node:child_process");
const { strict: assert } = require("node:assert");
const {
  mkdirSync,
  mkdtempSync,
  cpSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, dirname, isAbsolute, join, resolve } = require("node:path");

const packageRoot = resolve(__dirname, "..");
const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const workspace = mkdtempSync(join(tmpdir(), "pulumi-stack-orchestrator-pack-"));

try {
  const tarballPath = packPackage(packageRoot, workspace);
  run("tar", ["-xzf", tarballPath, "-C", workspace]);

  const consumerRoot = join(workspace, "consumer");
  const nodeModules = join(consumerRoot, "node_modules");
  mkdirSync(nodeModules, { recursive: true });
  installPackage(packageJson.name, join(workspace, "package"), nodeModules);
  symlinkPeerDependencies(packageRoot, packageJson, nodeModules);

  const smokeContext = {
    exports: packageJson.exports,
    packageName: packageJson.name,
  };

  writeFileSync(
    join(consumerRoot, "consumer.mjs"),
    `import assert from "node:assert/strict";\n` +
      `const context = ${JSON.stringify(smokeContext, null, 2)};\n` +
      `for (const [subpath, target] of Object.entries(context.exports)) {\n` +
      `  if (!target || typeof target !== "object" || !target.import) continue;\n` +
      `  const specifier = subpath === "." ? context.packageName : context.packageName + subpath.slice(1);\n` +
      `  const loaded = await import(specifier);\n` +
      `  assert.ok(loaded && typeof loaded === "object", specifier);\n` +
      `}\n`,
  );

  run("node", ["consumer.mjs"], { cwd: consumerRoot });
  console.log(`Packed package smoke test passed for ${packageJson.name}.`);
} finally {
  if (!process.env.KEEP_PACK_SMOKE) {
    rmSync(workspace, { force: true, recursive: true });
  }
}

function packPackage(root, destination) {
  const result = spawnSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: join(destination, ".npm-cache"),
    },
    stdio: ["ignore", "pipe", "inherit"],
  });

  assert.equal(result.status, 0);
  const packResult = JSON.parse(result.stdout)[0];
  return isAbsolute(packResult.filename)
    ? packResult.filename
    : join(destination, basename(packResult.filename));
}

function installPackage(packageName, source, nodeModules) {
  const target = join(nodeModules, ...packageName.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function symlinkPeerDependencies(root, pkg, nodeModules) {
  for (const peerName of Object.keys(pkg.peerDependencies ?? {})) {
    const source = join(root, "node_modules", ...peerName.split("/"));
    const target = join(nodeModules, ...peerName.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target, "dir");
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: "inherit",
  });

  assert.equal(result.status, 0);
}
