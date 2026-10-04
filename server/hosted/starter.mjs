// Offline release preparation only; this helper never creates or publishes resources.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { copyPayload, installRecord, SOURCE, run } from '../install-wongstack.mjs';
const json=(file)=>JSON.parse(readFileSync(file,'utf8'));
const write=(file,value)=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);};
const CONFIG_KEYS=['$schema','name','main','compatibility_date','compatibility_flags','assets','vars','previews','observability'];
const VARS=['WONG_ENVIRONMENT','CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD'];
export function hostedConfig({worker='hosted-starter',teamDomain='unconfigured.cloudflareaccess.com',audience='unconfigured'}={}) {
  if(typeof worker!=='string'||typeof teamDomain!=='string'||typeof audience!=='string'||!/^[a-z][a-z0-9-]{0,62}$/.test(worker)||!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain)||!/^[A-Za-z0-9_-]{1,128}$/.test(audience))throw Error('configuration');
  const access={CF_ACCESS_TEAM_DOMAIN:teamDomain,CF_ACCESS_AUD:audience};
  return {$schema:'node_modules/wrangler/config-schema.json',name:worker,main:'worker/index.ts',compatibility_date:'2026-07-28',compatibility_flags:['nodejs_compat','disallow_importable_env'],assets:{binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:true},vars:{WONG_ENVIRONMENT:'production',...access},previews:{vars:{WONG_ENVIRONMENT:'preview',...access}},observability:{enabled:true}};
}
export function validateHostedConfig(config,target) {
  if(typeof target!=='string'||!/^[a-z][a-z0-9-]{0,62}$/.test(target)||!config||typeof config.name!=='string'||Object.keys(config).some(key=>!CONFIG_KEYS.includes(key))||config.name!==target||config.main!=='worker/index.ts'||config.assets?.binding!=='ASSETS'||config.assets.run_worker_first!==true||config.assets.not_found_handling!=='single-page-application'||!config.previews||Object.keys(config.previews).some(key=>key!=='vars'))throw Error('configuration');
  for(const vars of [config.vars,config.previews.vars]) {
    if(!vars||typeof vars.CF_ACCESS_TEAM_DOMAIN!=='string'||typeof vars.CF_ACCESS_AUD!=='string'||Object.keys(vars).some(key=>!VARS.includes(key))||!['production','preview'].includes(vars.WONG_ENVIRONMENT)||!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(vars.CF_ACCESS_TEAM_DOMAIN)||!/^[A-Za-z0-9_-]{1,128}$/.test(vars.CF_ACCESS_AUD))throw Error('configuration');
  }
  if(config.vars.WONG_ENVIRONMENT!=='production'||config.previews.vars.WONG_ENVIRONMENT!=='preview'||config.vars.CF_ACCESS_TEAM_DOMAIN!==config.previews.vars.CF_ACCESS_TEAM_DOMAIN||config.vars.CF_ACCESS_AUD!==config.previews.vars.CF_ACCESS_AUD)throw Error('configuration');
  return config;
}
export function pinPackage(manifest,lock) {
  for(const group of ['dependencies','devDependencies']) {
    for(const name of Object.keys(manifest[group]??{})) {
      const version=lock.packages[`node_modules/${name}`]?.version;
      if(!version||!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version))throw Error('dependencies');
      manifest[group][name]=version;
    }
    if(manifest[group])lock.packages[''][group]={...manifest[group]};
  }
  if(manifest.devDependencies.wrangler!=='4.144.0')throw Error('dependencies');
  // Keep all application checks; hosted build has no migration or deploy hooks.
  manifest.scripts.build='npm run build:app';
  manifest.scripts.dev='vite';
  delete manifest.scripts['db:reset:staging'];
  delete manifest.scripts['secrets:push'];delete manifest.scripts['secrets:check'];delete manifest.scripts.deploy;
  return {manifest,lock};
}
/** A changed scaffold must be reviewed instead of silently dropping a required patch. */
export function replaceRequired(text,anchor,replacement) {
  if(text.split(anchor).length!==2)throw Error('starter_anchor');
  return text.replace(anchor,replacement);
}
export async function prepareStarter(dir,{exec=run,today,source=SOURCE}={}) {
  if(existsSync(dir))throw Error('path_conflict');
  if((await exec('git',['-C',source,'status','--porcelain','--untracked-files=all'])).stdout.trim())throw Error('source_not_reviewed');
  mkdirSync(dir,{recursive:true});
  const manifest=await copyPayload(dir,exec,{source});
  const record=await installRecord(manifest,exec,today,source);
  record.components.memory=null;
  write(join(dir,'.agents/.wong-stack.json'),record);
  const packages=pinPackage(json(join(dir,'app/package.json')),json(join(dir,'app/package-lock.json')));
  write(join(dir,'app/package.json'),packages.manifest);write(join(dir,'app/package-lock.json'),packages.lock);
  write(join(dir,'app/wrangler.jsonc'),hostedConfig());
  // Build-time literals go in compiled code, rather than editable deployment vars.
  writeFileSync(join(dir,'app/worker/hosted-env.d.ts'), `// Compatibility routes stay unconfigured; these optional types create no bindings.\ninterface Env { MEMORY_BUCKET?: R2Bucket; MEMORY_DB?: D1Database; }\n`);
  writeFileSync(join(dir,'app/worker/hosted-identity.ts'),`import type { AccessEnv } from './access.ts';\nexport const hostedIdentity = { projectId: __HOSTED_PROJECT__, sourceCommit: __HOSTED_SHA__ };\nexport function isOpenWorkspace(env: AccessEnv) {\n  return env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;\n}\ndeclare const __HOSTED_PROJECT__: string;\ndeclare const __HOSTED_SHA__: string;\n`);
  const worker=join(dir,'app/worker/index.ts');
  let code=readFileSync(worker,'utf8');
  code=`import { hostedIdentity, isOpenWorkspace } from './hosted-identity.ts';\n${code}`;
  code=replaceRequired(code,'    const open = env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;','    const open = isOpenWorkspace(env);');
  const protectedAnchor = `    if (!identity && !open) {
      const configured = env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD;
      return new Response(configured ? "Unauthorized" : "Workspace access is not configured", {
        status: configured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      });
    }`;
  code=replaceRequired(code,protectedAnchor,`${protectedAnchor}\n\n    if (url.pathname === '/_hosted/identity' && request.method === 'GET') {\n      return Response.json(hostedIdentity, { headers: { 'Cache-Control': 'no-store' } });\n    }`);
  writeFileSync(worker,code);
  const tests=join(dir,'app/worker/index.test.ts');
  let suite=readFileSync(tests,'utf8');
  suite=replaceRequired(suite,'  it("dispatches APIs only after a verified assertion",',`  it("reports compiled identity only to signed requests", async () => {\n    expect((await call('/_hosted/identity')).status).toBe(401);\n    expect((await call('/_hosted/identity', { 'Cf-Access-Authenticated-User-Email': 'owner@example.com' })).status).toBe(401);\n    const headers = { 'Cf-Access-Jwt-Assertion': await token() };\n    const response = await call('/_hosted/identity', headers);\n    expect(await response.json()).toEqual({ projectId: 'test-project', sourceCommit: '${'a'.repeat(40)}' });\n    expect(response.headers.get('Cache-Control')).toBe('no-store');\n    const wrongMethod = await call('/_hosted/identity', headers, env, 'POST');\n    expect(await wrongMethod.text()).toBe('asset');\n    const onlyAudience = { ASSETS: assets, WORKSPACE_LOGIN: 'off', CF_ACCESS_AUD: AUD } as unknown as typeof env;\n    expect((await call('/_hosted/identity', {}, onlyAudience)).status).toBe(503);\n  });\n  it("dispatches APIs only after a verified assertion",`);
  writeFileSync(tests,suite);
  const vitest=join(dir,'app/vitest.config.ts');
  writeFileSync(vitest,replaceRequired(readFileSync(vitest,'utf8'),'export default defineConfig({',`export default defineConfig({\n  define: { __HOSTED_PROJECT__: JSON.stringify('test-project'), __HOSTED_SHA__: JSON.stringify('${'a'.repeat(40)}') },`));
  const vite=join(dir,'app/vite.config.ts');
  let config=readFileSync(vite,'utf8');
  config=replaceRequired(config,'export default defineConfig({',`const project = process.env.WONG_HOSTED_PROJECT;\nconst sha = process.env.WONG_HOSTED_SHA;\nif (process.env.NODE_ENV === 'production' && (!project || !/^[A-Za-z0-9_-]{1,100}$/.test(project) || !sha || !/^[a-f0-9]{40}$/.test(sha))) throw new Error('Hosted build identity is required');\nexport default defineConfig({\n  define: { __HOSTED_PROJECT__: JSON.stringify(project ?? 'development'), __HOSTED_SHA__: JSON.stringify(sha ?? 'development') },`);
  writeFileSync(vite,config);
  write(join(dir,'.wongstack/hosted.json'),{version:1,provider:'artifacts',sourceCommit:record.commit});
  return record;
}
