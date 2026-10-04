import { digest } from './evidence.mjs';

function privateOrigin(value) {
  const url=new URL(value);
  if(typeof value!=='string'||!/^https:\/\/[^/?#]+\.workers\.dev\/?$/.test(value)
    ||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('Exact private output unavailable');
  return url;
}
async function boundedBytes(response,max) {
  if(!response.body)throw Error('Private response unavailable');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.length;if(size>max)throw Error('Private response exceeds its bound');chunks.push(value);
    }
  } finally {await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}
/** Probe only one already authorized immutable private URL. Headers never enter results. */
export async function probePrivateOutput(url,identity,manifest,headers,fetchFn=fetch) {
  const origin=privateOrigin(url),deadline=Date.now()+2*60_000;
  if(!identity||!/^[a-f0-9]{40}$/.test(identity.headSha)||typeof identity.projectId!=='string'
    ||!Array.isArray(manifest)||!manifest.length||manifest.length>100||!manifest.some(file=>file.path==='index.html'))throw Error('Exact private output unavailable');
  if(!headers||Object.keys(headers).length!==2||!['CF-Access-Client-ID','CF-Access-Client-Secret'].every(key=>
    typeof headers[key]==='string'&&headers[key].length>0&&!/[\r\n]/.test(headers[key])))throw Error('Project observer headers unavailable');
  const paths=new Set();let total=0;
  const surfaces=[{path:'/_hosted/identity'}, {path:'/__hosted/identity.json'},...manifest.map(file=>{
    if(!file||typeof file.path!=='string'||!file.path||file.path.startsWith('/')||file.path.split('/').some(part=>!part||part==='.'||part==='..')
      ||/[\\?#\s]/.test(file.path)||Array.from(file.path).some(char=>char.charCodeAt(0)<33||char.charCodeAt(0)===127)
      ||paths.has(file.path)||!Number.isSafeInteger(file.size)||file.size<0||file.size>10*1024*1024||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Exact private output unavailable');
    paths.add(file.path);total+=file.size;
    if(total>50*1024*1024)throw Error('Exact private output unavailable');
    return {...file,path:file.path==='index.html'?'/':`/${file.path.split('/').map(encodeURIComponent).join('/')}`};
  })];
  const results=[];
  for(const surface of surfaces) {
    const remaining=deadline-Date.now();if(remaining<=0)throw Error('Private observation deadline');
    const target=new URL(surface.path,origin).href;
    const options={redirect:'manual',signal:AbortSignal.timeout(Math.min(30_000,remaining))};
    const anonymous=await fetchFn(target,options);
    if(![401,403,302,303,307,308].includes(anonymous.status))throw Error('Private surface anonymously accessible or unresolved');
    await anonymous.body?.cancel();
    const authenticated=await fetchFn(target,{...options,headers});
    if(authenticated.status!==200)throw Error('Authenticated private surface unavailable');
    const bytes=await boundedBytes(authenticated,surface.size??100_000);
    if(surface.sha256) {if(bytes.length!==surface.size||digest(bytes)!==surface.sha256)throw Error('Private output bytes differ');}
    else {
      const value=JSON.parse(new TextDecoder().decode(bytes));
      if(surface.path==='/_hosted/identity'?value.projectId!==identity.projectId||value.sourceCommit!==identity.headSha:
        value.projectId!==identity.projectId||value.headSha!==identity.headSha||value.assetsDigest!==digest(JSON.stringify(manifest))||JSON.stringify(value.manifest)!==JSON.stringify(manifest))throw Error('Private compiled identity differs');
    }
    results.push({path:surface.path,anonymousStatus:anonymous.status,authenticatedStatus:200});
  }
  return {url,projectId:identity.projectId,headSha:identity.headSha,surfaces:results};
}
