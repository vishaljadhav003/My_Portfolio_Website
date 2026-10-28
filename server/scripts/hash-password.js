// Usage: npm run hash-password
// Prints a hash you can paste into SQL yourself:
//   INSERT INTO admins (username, password_hash, created_at) VALUES ('vishal', '<hash>', UTC_TIMESTAMP());
import { createInterface } from "node:readline";
import { hashPassword } from "../src/auth.js";

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Password to hash (visible while typing): ", async (password) => {
  rl.close();
  if (password.length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }
  console.log(await hashPassword(password));
});
