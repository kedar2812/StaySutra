/**
 * Create (or reset the password of) a dashboard account.
 *
 *   npm run user:create -- you@example.com "Your Name" OWNER
 *
 * The password is read from the PASSWORD environment variable, or generated and
 * printed once. Roles: OWNER, MANAGER, EDITOR.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient, type Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const [emailArg, name = "Owner", roleArg = "OWNER"] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const role = roleArg.toUpperCase() as Role;

if (!email || !["OWNER", "MANAGER", "EDITOR"].includes(role)) {
  console.error('Usage: npm run user:create -- email@example.com "Name" [OWNER|MANAGER|EDITOR]');
  process.exit(1);
}

const prisma = new PrismaClient();
const password = process.env.PASSWORD || randomBytes(9).toString("base64url");

prisma.user
  .upsert({
    where: { email },
    create: { email, name, role, passwordHash: await hash(password) },
    update: { passwordHash: await hash(password), isActive: true },
  })
  .then((u) => {
    console.log(`${u.email} (${u.role}) is ready.`);
    if (!process.env.PASSWORD) console.log(`Password: ${password}   ← shown once; change it after signing in.`);
  })
  .finally(() => prisma.$disconnect());
