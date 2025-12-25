/**
 * Cross-platform Prisma db push for template database.
 *
 * Why: npm scripts like `DATABASE_URL=... prisma ...` fail on Windows (cmd/powershell),
 * causing CI to stop at db:template. This script makes it portable.
 */

const { spawnSync } = require("node:child_process");

function main() {
  const env = { ...process.env, DATABASE_URL: "file:./prisma/template.db" };

  // Use shell so "prisma" resolves via npm's PATH (node_modules/.bin) on all platforms.
  const result = spawnSync("prisma db push", {
    stdio: "inherit",
    shell: true,
    env,
  });

  if (result.error) {
    // eslint-disable-next-line no-console
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

main();



