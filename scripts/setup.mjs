import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".dev.vars")) {
  const password = randomBytes(18).toString("base64url");
  writeFileSync(
    ".dev.vars",
    `ADMIN_PASSWORD=${password}\nADMIN_SESSION_SECRET=${randomBytes(48).toString("hex")}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Created .dev.vars with a random admin password and session secret. Read ADMIN_PASSWORD locally to sign in.",
  );
} else console.log("Preserving existing .dev.vars.");
