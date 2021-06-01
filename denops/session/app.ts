import { main } from "https://deno.land/x/denops_std@v0.11/mod.ts";
import * as path from "https://deno.land/std@0.97.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.97.0/fs/mod.ts";

function ensureString(arg: unknown): arg is string {
  return typeof arg === "string";
}

main(async ({ vim }) => {
  const home = Deno.env.get("HOME");
  if (!home) {
    console.log("$HOME is empty");
    return;
  }
  const sessionPath = await vim.g.get(
    "denops_session_path",
    path.join(home, ".vim", "sessions"),
  ) as string;

  if (!sessionPath) {
    console.error("session path is empty");
    return;
  }

  await fs.ensureDir(sessionPath);

  vim.register({
    async sessionSave() {
      const file = await vim.call("input", "session name:");
      if (ensureString(file)) {
        await vim.cmd(`mksession! ${path.join(sessionPath, file + ".vim")}`);
        console.log("session saved");
      }
    },

    async sessionLoad() {
      const file = await vim.eval(`getline(line("."))`);
      if (ensureString(file) && file !== "") {
        await vim.cmd(`source ${path.join(sessionPath, file)}`);
        console.log(`${file} is loaded`);
      } else {
        console.error(`invalid file: ${file}`);
      }
    },

    async getSessionFiles() {
      const files = [] as string[];
      for await (const file of fs.expandGlob(sessionPath + "/**.vim")) {
        console.log(file);
        if (path.isAbsolute(file.path)) {
          files.push(path.basename(file.path));
        } else {
          files.push(file.path);
        }
      }

      await vim.cmd("new denops://sessions | setlocal buftype=nofile");
      await vim.call("setline", 1, files);
      await vim.cmd(
        `nnoremap <silent> <buffer> <CR> :call denops#notify("${vim.name}", "sessionLoad", [])<CR>`,
      );
    },
  });

  await vim.cmd(
    `command! DenopsSessionSave call denops#notify("${vim.name}", "sessionSave", [])`,
  );

  await vim.cmd(
    `command! DenopsSessionFiles call denops#notify("${vim.name}", "getSessionFiles", [])`,
  );
});
