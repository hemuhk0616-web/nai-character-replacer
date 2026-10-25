"""Build public ID->name facts; inputs contain no player inventory.

Inputs: gbf_database_*.json (gbf.wiki export), Motocal armData/charaData.
Generated bundle is self-contained so the bookmark needs one catalogue request.
"""
import json,re,sys,pathlib
root=pathlib.Path(__file__).parent
db,arms,chars=map(pathlib.Path,sys.argv[1:4])
source=json.loads(db.read_text());out={'version':'2026-10-25.1','sources':{
 'gbf_wiki_export':{'url':'https://gbf.wiki/','exported_at':source.get('exported_at'),'language':'en'},
 'motocal_armData':{'url':'https://github.com/MotocalDevelopers/motocal/blob/master/armData.json','language':'ja'},
 'motocal_charaData':{'url':'https://github.com/MotocalDevelopers/motocal/blob/master/charaData.json','language':'ja'},
 'arcarum_aliases':{'url':'https://gbf.wiki/Module:Turtleli','note':'Explicit fix_arcarum_id table, not an arithmetic guess.'}
}}
for kind in ['weapons','characters','summons']:
 out[kind]={}
 grouped={}
 for row in source[kind]:
  ident=str(row.get('id',''))
  if not re.fullmatch(r'\d{10}',ident):continue
  grouped.setdefault(ident,[]).append(row)
 for ident,rows in grouped.items():
  row=rows[0]
  aliases=sorted({r.get('_pageName') or r.get('link') or r.get('name') for r in rows}-{None,''})
  common={r.get('name') for r in rows}-{None,''}
  name=aliases[0] if len(aliases)==1 else next(iter(common)) if len(common)==1 else None
  out[kind][ident]={'name_en':name,'sources':['gbf_wiki_export']}
  if len(aliases)>1:out[kind][ident]['aliases_en']=aliases
  if row.get('series'):out[kind][ident]['series_en']=row['series']
for kind,p,label in [('weapons',arms,'motocal_armData'),('characters',chars,'motocal_charaData')]:
 candidates={}
 for key,row in json.loads(p.read_text()).items():
  match=re.search(r'(\d{10})',row.get('imageURL',''))
  if not match:continue
  ident=match[1];name=row.get('ja') or key
  # These are upgrade annotations added by the calculator, not identity variants.
  name=re.sub(r'^(?:\[(?:[0-9]+凸|最終|限界超越)\])+','',name)
  candidates.setdefault(ident,set()).add(name)
 for ident,names in candidates.items():
  if len(names)!=1:continue # Conflicting source names must be resolved manually.
  entry=out[kind].setdefault(ident,{'sources':[]});entry['name_ja']=next(iter(names));entry['sources'].append(label)
aliases={'2040313000':'2040236000','2040314000':'2040237000','2040315000':'2040238000','2040316000':'2040239000','2040317000':'2040240000','2040318000':'2040241000','2040319000':'2040242000','2040320000':'2040243000','2040321000':'2040244000','2040322000':'2040245000'}
for alias,original in aliases.items():
 if original in out['summons']:
  out['summons'][alias]={**out['summons'][original],'alias_of':original,'sources':out['summons'][original]['sources']+['arcarum_aliases']}
payload=json.dumps(out,ensure_ascii=False,separators=(',',':'))
(root/'identity-data.json').write_text(payload+'\n')
runtime=(root/'identity-runtime.js').read_text()
# Node exports use the JSON file; browser loads the same data from the bundled object.
(root/'identity-catalogue.js').write_text('/* Generated public catalogue. See identity-data.json sources. */\nif(typeof module!=="object"||!module.exports)globalThis.__GBF_IDENTITY_DATA_V1__='+payload+';\n'+runtime)
print({k:len(out[k]) for k in ['weapons','characters','summons']})
