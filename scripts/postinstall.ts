import { exec } from "child_process";
import { promisify } from "util";
import "load-env";
const execPromise = promisify(exec);

async function runCommand(command: string, description: string) {
  console.log(`Starting: ${description}`);
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
      env: process.env,
    });

    console.log(`${description} output:`);
    console.log(stdout);

    if (stderr) {
      console.error(`${description} stderr:`);
      console.error(stderr);
    }
    console.log(`${description} finished successfully.`);
  } catch (error: any) {
    console.error(`${description} error:`, error);
    process.exit(1);
  }
}

async function main() {
  console.log("Running initial environment setup.");
  await runCommand("pnpm initial:env", "Initial environment setup");
}

main();
