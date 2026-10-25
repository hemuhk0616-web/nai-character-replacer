/* Public identity facts only. Never sends account data to a server. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./identity-data.json'):root.__GBF_IDENTITY_DATA_V1__);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.GBFIdentityCatalogue=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(data){
  'use strict';
  const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
  function enrichRow(row,kind){
    const id=String(row.master_id??row.job_id??''),entry=data[kind]?.[id];
    const native=text(row.raw?.master?.name)??text(row.raw?.item_name)??text(row.raw?.name)??text(row.name);
    const ja=text(entry?.name_ja),en=text(entry?.name_en);
    row.name=native??ja??en;row.name_ja=native&&/[\u3040-\u30ff\u3400-\u9fff]/.test(native)?native:ja;
    row.name_en=en;row.name_language=native?'game':ja?'ja':en?'en':null;
    row.identity_status=native?'game_response':entry&&(ja||en)?'external_id_match':'unresolved';
    row.identity_sources=native?['game_response']:(entry?.sources??[]);
    row.identity_aliases_en=entry?.aliases_en??[];
    row.series_ja=text(entry?.series_ja);row.series_en=text(entry?.series_en);
    row.identity_catalogue_version=data.version;
    return row;
  }
  function enrichReport(report){
    const coverage={catalogue_version:data.version,total:0,named:0,japanese:0,english_fallback:0,unresolved:0,by_section:{}};
    const types={weapons:'weapons',weapon_storage:'weapons',giftbox_weapons:'weapons',summons:'summons',summon_storage:'summons',giftbox_summons:'summons',characters:'characters',jobs:'jobs'};
    for(const[key,kind]of Object.entries(types)){
      const rows=report.sections?.[key]?.items;if(!Array.isArray(rows))continue;
      const counts={total:rows.length,named:0,unresolved:0};
      for(const row of rows){enrichRow(row,kind);coverage.total++;if(row.name){coverage.named++;counts.named++;if(row.name_ja)coverage.japanese++;else if(row.name_language==='en')coverage.english_fallback++;}else{coverage.unresolved++;counts.unresolved++;}}
      coverage.by_section[key]=counts;
    }
    for(const party of report.sections?.equipped_parties?.items??[]){
      for(const key of ['weapons','summons','sub_summons','characters'])for(const row of party[key]??[])if(row.master_id)enrichRow(row,key==='sub_summons'?'summons':key);
    }
    report.identity_coverage=coverage;report.identity_sources=data.sources;
    return report;
  }
  return {version:data.version,enrichRow,enrichReport};
});
