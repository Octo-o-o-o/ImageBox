#!/usr/bin/env node
/**
 * Sync version across the repo.
 *
 * Recommended source of truth: git tag (e.g. v0.1.16) or a plain version (0.1.16).
 *
 * Usage:
 *   node scripts/sync-version.mjs --version 0.1.16
 *   node scripts/sync-version.mjs --tag v0.1.16
 *   node scripts/sync-version.mjs --from-env   (uses GITHUB_REF_NAME / npm_package_version)
 *
 * By default this updates:
 *  - ImageBox/package.json
 *  - ImageBox-Web/package.json (if exists)
 */

import fs from "fs";
import path from "path";

const cwd = process.cwd();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--version") args.version = argv[++i];
    else if (a === "--tag") args.tag = argv[++i];
    else if (a === "--from-env") args.fromEnv = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function normalizeVersion(input) {
  if (!input) return null;
  const v = String(input).trim();
  if (v.startsWith("v")) return v.slice(1);
  return v;
}

function isSemverLike(v) {
  // good enough for your current versioning scheme: x.y.z
  return /^\d+\.\d+\.\d+$/.test(v);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

function updatePackageJson(pkgPath, version) {
  const pkg = readJson(pkgPath);
  pkg.version = version;
  writeJson(pkgPath, pkg);
  console.log(`[sync-version] updated ${path.relative(cwd, pkgPath)} -> ${version}`);
}

const args = parseArgs(process.argv);

if (args.help) {
  console.log(
    [
      "sync-version.mjs",
      "  --version 0.1.16",
      "  --tag v0.1.16",
      "  --from-env   (GITHUB_REF_NAME / npm_package_version)",
    ].join("\n")
  );
  process.exit(0);
}

let version =
  normalizeVersion(args.version) ??
  normalizeVersion(args.tag) ??
  (args.fromEnv
    ? normalizeVersion(process.env.GITHUB_REF_NAME ?? process.env.npm_package_version)
    : null);

if (!version) {
  console.error("[sync-version] missing version. Use --version / --tag / --from-env");
  process.exit(1);
}

if (!isSemverLike(version)) {
  console.error(`[sync-version] invalid version "${version}". Expected x.y.z (e.g. 0.1.16)`);
  process.exit(1);
}

// Repo layout: /Users/.../ImageBox/ImageBox + ImageBox-Web at sibling
const imageBoxDir = cwd; // should be ImageBox/
const pkgMain = path.join(imageBoxDir, "package.json");
if (!fs.existsSync(pkgMain)) {
  console.error(`[sync-version] cannot find ${pkgMain}. Run this inside ImageBox/ directory.`);
  process.exit(1);
}

updatePackageJson(pkgMain, version);

const pkgWeb = path.join(imageBoxDir, "..", "ImageBox-Web", "package.json");
if (fs.existsSync(pkgWeb)) {
  updatePackageJson(pkgWeb, version);
}


