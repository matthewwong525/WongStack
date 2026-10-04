import json,re,pathlib
r=pathlib.Path('/tmp/wong-verify-eval-run-prMKzm'); u='http://127.0.0.1:44819'
sc=[]
for p in [pathlib.Path('openspec/changes/practice-notes/specs/notes/spec.md'),pathlib.Path('openspec/changes/practice-notes/specs/practice-captures/spec.md'),pathlib.Path('openspec/specs/exports/spec.md')]:
 req=''
 for line in p.read_text().splitlines():
  if line.startswith('### Requirement: '): req=line[17:]
  if line.startswith('#### Scenario: '): sc.append({'requirement':req,'scenario':line[15:],'source':str(p)})
  if line.startswith('- **THEN** '): sc[-1]['then']=line[11:]
ids=['01-count','02-search','03-empty-form','04-create','05-empty-api','06-create-api','07-rename','08-badge','09-audit','10-delete','11-archive','12-email','13-lookup-a','14-lookup-b','15-lookup-c','16-lookup-d','17-lookup-e','18-panel','19-alpha','20-bravo','21-exports']
def nav(path): return [['open',u+path],['wait','--load','networkidle']]
def shot(i,n): return [['screenshot',str(r/'evidence'/i/(n+'.png')),'--full'],['snapshot']]
def fill(v): return [['find','label','Title','fill',v]]
def click(role,name):return [['find','role',role,'click','--name',name]]
def save(): return click('button','Save')+[['wait','--load','networkidle'],['wait','1000']]
batches={
1:nav('/')+shot(ids[1],'01-before')+[['find','label','Search','fill','plumber']]+click('button','Search')+[['wait','--load','networkidle']]+shot(ids[1],'02-results'),
2:nav('/new')+save()+shot(ids[2],'01-submitted')+nav('/')+shot(ids[2],'02-readback'),
3:nav('/new')+fill('Walk typed title 44819')+save()+shot(ids[3],'01-created')+[['reload'],['wait','--load','networkidle']]+shot(ids[3],'02-reloaded'),
6:nav('/notes/1/edit')+fill('Walk renamed groceries')+save()+shot(ids[6],'01-saved')+nav('/')+shot(ids[6],'02-list'),
7:nav('/notes/2/edit')+fill('Walk badge plumber')+save()+shot(ids[7],'01-badge'),
9:nav('/')+shot(ids[9],'01-before')+click('button','Delete Trip ideas')+[['wait','--load','networkidle']]+shot(ids[9],'02-after'),
10:nav('/')+click('button','Archive Plumber invoice')+[['wait','--load','networkidle']]+shot(ids[10],'01-main')+nav('/archived')+shot(ids[10],'02-archived'),
11:nav('/')+shot(ids[11],'01-before')+click('button','Archive Book club picks')+[['wait','--load','networkidle']]+shot(ids[11],'02-after'),
17:nav('/unavailable')+shot(ids[17],'01-panel'),
18:nav('/settings/alpha')+fill('Walk alpha 44819')+save()+shot(ids[18],'01-saved')+nav('/settings/alpha')+shot(ids[18],'02-reopened'),
19:nav('/settings/bravo')+fill('Walk bravo 44819')+save()+shot(ids[19],'01-saved')+nav('/settings/bravo')+shot(ids[19],'02-reopened'),
20:nav('/exports')+shot(ids[20],'01-export')}
requests={0:[('GET','/api/notes')],2:[('GET','/api/notes')],4:[('GET','/api/notes'),('POST','/api/notes',{}),('GET','/api/notes')],5:[('POST','/api/notes',{'title':'Walk API created 44819'}),('GET','/api/notes')],8:[('PUT','/api/notes/6',{'title':'Walk API renamed garden'}),('GET','/api/notes')],17:[('GET','/unavailable')],18:[('GET','/api/settings/alpha')],19:[('GET','/api/settings/bravo')],20:[('GET','/api/notes'),('GET','/exports')]}
for n,x in enumerate('abcde',12): requests[n]=[('GET','/practice/evidence/lookup-'+x)]
for n,(i,s) in enumerate(zip(ids,sc)):
 s.update(id=i,probe='browser' if n in batches else 'request',revision='a'*40,prerequisites='disposable practice-node site',status='runnable',cleanup='Site lifetime owns disposable in-memory state; no shared data')
 (r/'journeys'/(i+'.meta.json')).write_text(json.dumps(s,indent=2))
 if n in batches:(r/'journeys'/(i+'.batch.json')).write_text(json.dumps(batches[n],indent=2))
 if n in requests:(r/'journeys'/(i+'.requests.txt')).write_text(''.join('\t'.join([z[0],z[1]]+([json.dumps(z[2])] if len(z)>2 else []))+'\n' for z in requests[n]))
(r/'ledger.json').write_text(json.dumps({'scenarios':sc,'relationship':'exports consumes GET /api/notes title field; health excluded because no notes/settings relationship','isolation':'wiki/practice-captures.md: disposable in-memory practice data, no real delivery','source':'a'*40},indent=2))
