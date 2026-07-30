declare const __COMMIT_HASH__: string | undefined;

export function getCommitHash(): string {
  // if (typeof __COMMIT_HASH__ !== "undefined") {
  //   return __COMMIT_HASH__;
  // }

  // try {
  //   return require("child_process")
  //     .execSync("git rev-parse --short HEAD")
  //     .toString()
  //     .trim();
  // } catch {
  //   return "unknown";
  // }
  // TODO: fix
  return 'a_hash';
}
