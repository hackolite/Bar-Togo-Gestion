const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  console.log("Building web app for deployment...");

  if (fs.existsSync("static-build")) {
    fs.rmSync("static-build", { recursive: true, force: true });
  }

  await run("npx", [
    "expo",
    "export",
    "--platform",
    "web",
    "--output-dir",
    "static-build",
    "--clear",
  ]);

  const indexPath = path.join("static-build", "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Web build did not produce static-build/index.html");
  }

  console.log("Web build complete:", indexPath);
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});
