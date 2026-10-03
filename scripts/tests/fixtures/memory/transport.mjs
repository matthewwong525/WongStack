// TEST ONLY preload. No override or bypass is imported by the shipped client.
const original=globalThis.fetch;
const origin='https://fixture-memory.example.workers.dev';
if(process.env.WONG_TEST_MEMORY_TRANSPORT) {
 const target=new URL(process.env.WONG_TEST_MEMORY_TRANSPORT);
 if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw new Error('invalid fixture transport');
 globalThis.fetch=(url,init)=>{
  const request=new URL(typeof url==='string'?url:url.url||url.href);
  if(request.origin!==origin)throw new Error('unexpected fixture production origin');
  return original(new URL(request.pathname,target),init);
 };
}
