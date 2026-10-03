// Host runtime only. Security provisioning runs in the actual pinned source.
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
export const sourceOrigin = (origin) => /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)(?:\.git)?\/?$/i.exec(origin)?.[1]?.toLowerCase();
export async function sourceInstaller(job, exec, home = "/home/wong") {
  if (!REPO.test(job?.sourceRepo ?? "") || !/^[a-f0-9]{40}$/.test(job?.sourceCommit ?? "")) throw new Error("unsupported_contract");
  const dir = `${home}/.cache/wong-stack/source-${job.sourceCommit}`;
  let fresh = false;
  await exec(["mkdir", "-p", `${home}/.cache/wong-stack`]);
  await exec(["test", "-d", `${dir}/.git`]).catch(async () => { fresh = true; await exec(["git", "clone", "--no-checkout", `https://github.com/${job.sourceRepo}.git`, dir]); });
  const origin = (await exec(["git", "-C", dir, "remote", "get-url", "origin"])).stdout.trim();
  if (sourceOrigin(origin) !== job.sourceRepo.toLowerCase()) throw new Error("unsupported_contract");
  if (!fresh && (await exec(["git", "-C", dir, "status", "--porcelain", "--untracked-files=all", "--ignored"])).stdout.trim()) throw new Error("unsupported_contract");
  await exec(["git", "-C", dir, "fetch", "--depth", "1", "origin", job.sourceCommit]);
  await exec(["git", "-C", dir, "checkout", "--detach", job.sourceCommit]);
  if ((await exec(["git", "-C", dir, "rev-parse", "HEAD"])).stdout.trim() !== job.sourceCommit) throw new Error("unsupported_contract");
  if ((await exec(["git", "-C", dir, "status", "--porcelain", "--untracked-files=all", "--ignored"])).stdout.trim()) throw new Error("unsupported_contract");
  await exec(["test", "-f", `${dir}/server/access-result.mjs`]);
  await exec(["test", "-f", `${dir}/server/install-wongstack.mjs`]);
  return `${dir}/server/install-wongstack.mjs`;
}
