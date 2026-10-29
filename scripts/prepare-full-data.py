"""Retain full published tables and normalize all unambiguous district crop measures."""
import collections,datetime,hashlib,json,math,pathlib,re,sys,warnings
import openpyxl
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'data/private/python-packages'))
import xlrd
STAMP=datetime.datetime.now(datetime.timezone.utc).isoformat()
DISTRICTS=['Nyarugenge','Gasabo','Kicukiro','Nyanza','Gisagara','Nyaruguru','Huye','Nyamagabe','Ruhango','Muhanga','Kamonyi','Karongi','Rutsiro','Rubavu','Nyabihu','Ngororero','Rusizi','Nyamasheke','Rulindo','Gakenke','Musanze','Burera','Gicumbi','Rwamagana','Nyagatare','Gatsibo','Kayonza','Kirehe','Ngoma','Bugesera']
PROVINCE={d:('Kigali City' if i<3 else 'Southern' if i<11 else 'Western' if i<18 else 'Northern' if i<23 else 'Eastern') for i,d in enumerate(DISTRICTS)}
SUBTYPES={'Cooking Banana':'Banana','Dessert Banana':'Banana','Banana for Beer':'Banana','Bush Beans':'Beans','Climbing Beans':'Beans','Small Red Beans':'Beans','Bush Beans + Small Red Beans':'Beans'}
ALIASES={'paddy rice':'Rice','bean':'Beans','beans':'Beans','irish potatoes':'Irish Potato','sweet potatoes':'Sweet Potato','bananas':'Banana','pea':'Peas','groundnut':'Groundnuts','ground nuts':'Groundnuts','soya beans':'Soybean','soya bean':'Soybean','soybeans':'Soybean','yarms & taro':'Yams & Taro','yams and taro':'Yams & Taro','bush bean':'Bush Beans','climbing bean':'Climbing Beans','small red bean':'Small Red Beans','banana for beer':'Banana for Beer'}
ALIASES.update({'folder crops':'Fodder Crops','chia seed':'Chia Seeds','taro & yams':'Yams & Taro','yarm & taro':'Yams & Taro','for beer':'Banana for Beer','bush bean+small red bean':'Bush Beans + Small Red Beans'})
GROUPS={'cereals','tubers and roots','legumes and pulses','vegetables and fruits','all crops','total developed land','developed land','developped land','total developped land','total developed crop area','total','national','district','district/crop','crop','crops','districts'}
BASE={'SAS_2024_Annual_Tables.xlsx':(2024,'SAS','ab','2025-02-11','https://statistics.gov.rw/statistical-publications/agriculture-environment/seasonal-agricultural-survey-2024-annual-report-2024'),'SAS_2025_Annual_Tables.xlsx':(2025,'SAS','ab','2025-12-31','https://statistics.gov.rw/data-sources/surveys/Seasonal-Agricultural-Survey/Seasonal-Agricultural-Survey/seasonal-agricultural-survey-2025-'),'Tables_2026_Season_A.xlsx':(2026,'SAS','a','2026-04-28','https://statistics.gov.rw/statistical-publications/agriculture-environment/seasonal-agricultural-survey-season-2026'),'Tables_2026_Season_B.xlsx':(2026,'SAS','b','2026-09-22','https://statistics.gov.rw/statistical-publications/agriculture-environment/seasonal-agricultural-survey-season-b-2026')}
def clean(v):return re.sub(r'\s+',' ',str(v or '')).strip()
def crop_name(v):
 t=clean(v).lower()
 if not t or t[0].isdigit() or t in GROUPS or re.search(r'\b(?:season|survey|land|total|district|province|stratum|source)\b',t):return None
 if re.sub(r'\s+','',t) in ['taro&yams','yams&taro']:return 'Yams & Taro'
 if t=='fruits/watermelon':return 'Fruits'
 return ALIASES.get(t,clean(v).title())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def safe(v):
 if isinstance(v,(datetime.date,datetime.datetime)):return v.isoformat()
 return None if isinstance(v,float) and not math.isfinite(v) else v
def sheets(path):
 if path.suffix=='.xls':
  w=xlrd.open_workbook(path)
  return [(s.name,[[safe(v) if v!='' else None for v in s.row_values(i)] for i in range(s.nrows)]) for s in w.sheets()]
 with warnings.catch_warnings():
  warnings.simplefilter('ignore');w=openpyxl.load_workbook(path,data_only=True,read_only=True)
  result=[(s.title,[[safe(v) for v in row] for row in s.values]) for s in w];w.close();return result
def title_of(rows,name):
 texts=[clean(v) for r in rows[:10] for v in r if isinstance(v,str) and clean(v)]
 return next((t for t in texts if re.match(r'(?:table\s*\d|appendix\s*\d)',t,re.I) and len(t)>18),next((t for t in texts if len(t)>25),name))
def topic_of(title):
 for key,words in [('Survey quality',['sampl','confidence','error']),('Fertilizer',['fertiliz','fertilis']),('Pesticides',['pesticid']),('Seeds',['seed','sowing']),('Irrigation',['irrigat','source of water']),('Erosion & practices',['erosion','agroforest','agricultural practices']),('Crop production',['production','yield','crop area','harvested','cultivated area']),('Land use',['land','strata','stratum']),('Livestock',['livestock','cattle','poultry','animal']),('Households & livelihoods',['household','population','income','poverty','credit','extension','labor','labour'])]:
  if any(w in title.lower() for w in words):return key
 return 'Other published statistics'

observations=[];tables=[];indexes=[];datasets=[];logs=[];audit=[];checks=[]
for source in json.loads((ROOT/'migration/nisr-source-manifest.json').read_text()):
 filename=source['filename'];path=ROOT/'data/private/nisr'/filename
 year,family,suffix,published,page=BASE.get(filename,(source.get('year'),source.get('family'),'annual','',source.get('publication_url',source['url'])))
 dataset_id=f'nisr-{family.lower()}-{year}-{suffix}';dataset_name=f'NISR {family} {year} · '+('Season '+suffix.upper() if suffix in ['a','b'] else 'Annual tables')
 before=len(observations);table_before=len(tables)
 for name,rows in sheets(path):
  last=max((i+1 for i,r in enumerate(rows) if any(v is not None for v in r)),default=0)
  if not last:continue
  rows=rows[:last];cols=max((i+1 for r in rows for i,v in enumerate(r) if v is not None),default=0)
  rows=[r[:cols]+[None]*max(0,cols-len(r)) for r in rows]
  title=title_of(rows,name);heading=title.lower()
  meta={'id':dataset_id+'-table-'+re.sub(r'[^a-z0-9]+','-',name.lower()),'name':title,'sheet':name,'dataset_id':dataset_id,'dataset_name':dataset_name,'year':year,'family':family,'topic':topic_of(title),'row_count':len(rows),'column_count':cols,'source_url':source['url'],'publication_url':page,'publication_date':published or None,'retrieval_date':STAMP[:10],'source_reference':filename+', '+name,'created_date':STAMP}
  indexes.append(meta);tables.append({**meta,'rows':rows})
  if family!='SAS' or 'district' not in heading or any(x in heading for x in ['large-scale','large scale','site','percentage','(%)','detailed banana and beans average yield']):continue
  metric='harvested_area' if 'harvested' in heading and 'area' in heading else 'cultivated_area' if 'cultivat' in heading and 'area' in heading else 'production' if 'production' in heading else 'reported_yield' if 'yield' in heading else None
  if not metric:continue
  section_seasons={('SAS_2017_Tables.xls','Table 96'):'C',('SAS_2017_Tables.xls','Table 99'):'C',('SAS_2017_Tables.xls','Table 100'):'C',('SAS_2018_Tables.xlsx','Appendix 3'):'C',('SAS_2018_Tables.xlsx','Appendix 5'):'B'}
  section=section_seasons.get((filename,name.strip()))
  season=re.search(r'season[\s_]*([abc])(?=[\W_]|$)',heading)
  if section and not season:
   heading+=' season '+section.lower();season=re.search(r'season\s*([abc])(?=[\W_]|$)',heading)
  if not season:
   audit.append({'file':filename,'sheet':name,'reason':'Reporting season is not explicit; full table retained.'});continue
  season='Season '+season.group(1).upper()
  transposed=any(sum(clean(v) in DISTRICTS for v in r)>10 for r in rows[:10])
  if transposed:rows=[list(r) for r in zip(*rows)]
  data_rows=[(i,r) for i,r in enumerate(rows) if any(clean(v) in DISTRICTS for v in r)]
  if not data_rows:continue
  first=data_rows[0][0];district_col=next(i for i,v in enumerate(data_rows[0][1]) if clean(v) in DISTRICTS)
  header_index=max(range(first),key=lambda i:sum(bool(crop_name(v)) for v in rows[i][district_col+1:]))
  crop_columns={i:crop_name(v) for i,v in enumerate(rows[header_index]) if i>district_col and crop_name(v)}
  duplicates=collections.Counter(crop_columns.values())
  for crop,n in duplicates.items():
   if n>1:audit.append({'file':filename,'sheet':name,'crop':crop,'reason':'Repeated ambiguous header; normalized columns excluded, full table retained.'})
  crop_columns={i:c for i,c in crop_columns.items() if duplicates[c]==1}
  if metric=='reported_yield' and not re.search(r'kg\s*/\s*ha',heading):
   audit.append({'file':filename,'sheet':name,'reason':'Yield unit not explicit; full table retained.'});continue
  for ri,row in data_rows:
   district=clean(row[district_col])
   for ci,crop in crop_columns.items():
    raw=row[ci];value=float(raw) if isinstance(raw,(int,float)) and not isinstance(raw,bool) and math.isfinite(raw) and raw>=0 else None
    unit='metric tonnes' if metric=='production' else 'kilograms per hectare' if metric=='reported_yield' else 'hectares'
    cell=openpyxl.utils.get_column_letter((ri if transposed else ci)+1)+str((ci if transposed else ri)+1)
    observations.append({'id':f'{dataset_id}-{season[-1]}-{district}-{crop}-{metric}'.replace(' ','-').lower(),'domain':'crop','geography':district,'geography_level':'district','province':PROVINCE[district],'crop':crop,'parent_crop':SUBTYPES.get(crop),'aggregation_level':'subtype' if crop in SUBTYPES else 'main','season':season,'year':year,'period':f'{year} {season}','indicator':metric,'value':value,'unit':unit,'observation_status':'observed' if value is not None else 'missing','quality_status':'verified','is_demo':False,'dataset_id':dataset_id,'dataset_name':dataset_name,'source_url':source['url'],'source_reference':f'{filename}, {name}!{cell}','source_cell':cell,'source_sheet':name,'source_value':raw,'quality_flags':[] if value is not None else ['Missing, negative or non-numeric source cell'],'created_date':STAMP,'updated_date':STAMP})
  if metric in ['production','harvested_area','cultivated_area']:
   national=next((r for r in rows[first:] if clean(r[district_col]).lower() in ['rwanda','national','total','country']),None)
   if national:
    for ci,crop in crop_columns.items():
     expected=national[ci];selected=[o for o in observations[before:] if o['source_sheet']==name and o['crop']==crop]
     if isinstance(expected,(int,float)) and len(selected)==30 and all(o['value'] is not None for o in selected):
      actual=sum(o['value'] for o in selected);tolerance=max(2,abs(expected)*0.002);passed=abs(actual-expected)<=tolerance
      checks.append({'file':filename,'sheet':name,'crop':crop,'indicator':metric,'district_sum':actual,'national_value':expected,'tolerance':tolerance,'passed':passed})
      if not passed:
       for o in selected:o['quality_flags'].append('District sum differs from published national total; inspect the source table.')
  audit.append({'file':filename,'sheet':name,'normalized_rows':len(data_rows)*len(crop_columns),'metric':metric,'season':season})
 selected=observations[before:]
 dataset={'id':dataset_id,'name':dataset_name,'publisher':'National Institute of Statistics of Rwanda (NISR)','family':family,'source_url':source['url'],'publication_url':page,'source_reference':filename+'; all populated worksheets','retrieval_date':STAMP[:10],'publication_date':published or None,'reporting_period':', '.join(sorted({o['period'] for o in selected})) or str(year),'geographic_coverage':'Original national, provincial, district or survey-stratum geography retained per table','geography_level':'district' if selected else 'mixed','units':'Original table units retained; normalized measures carry explicit units','version':sha(path)[:12],'license':'Publicly downloadable NISR tables; attribution retained. No additional redistribution licence asserted.','quality_status':'verified','is_demo':False,'data_kind':'published_aggregate','indicators':sorted({o['indicator'] for o in selected})+(['yield'] if selected else []),'row_count':len(selected),'table_count':len(tables)-table_before,'sha256':sha(path),'methodology':'All populated worksheets retained. District crop measures normalized where period, geography and units are unambiguous. Parent and child categories stay separate; all-crop totals exclude subtypes. Derived yield requires matching production and positive harvested area.','limitations':'Availability varies by crop, year, season and measure. Provincial or stratum estimates are not assigned to districts. Blank or ambiguous values remain unavailable. Seasonal crop areas are not unique physical land. Historical methods and revisions can affect comparisons.','quality_warnings':['Table coverage is not survey confidence.','Published yield is distinct from derived yield.','Unresolved tables remain available in the full table library.'],'created_date':published or str(year)+'-12-31','updated_date':STAMP}
 reconciliation_warnings=sum(any('national total' in flag for flag in o['quality_flags']) for o in selected)
 if reconciliation_warnings:
  dataset['quality_status']='provisional'
  dataset['quality_warnings'].append(str(reconciliation_warnings)+' source cells have district/national reconciliation warnings; source values are unchanged.')
 warning_count=sum(bool(o['quality_flags']) for o in selected)
 datasets.append(dataset);logs.append({'id':'import-'+dataset_id,'file_name':filename,'imported_rows':len(selected),'table_count':dataset['table_count'],'warning_count':warning_count,'status':'completed_with_warnings' if warning_count else 'completed','completed_date':STAMP,'dataset_id':dataset_id,'notes':'Full workbook imported; crop measures normalized where unambiguous.'})
 print(filename+': '+str(dataset['table_count'])+' full tables; '+str(len(selected))+' crop measures',flush=True)
duplicates=collections.Counter(o['id'] for o in observations)
if any(n>1 for n in duplicates.values()):
 (ROOT/'data/private/duplicate-observations.json').write_text(json.dumps([o for o in observations if duplicates[o['id']]>1]))
 raise RuntimeError('Duplicate normalized IDs; inspect data/private/duplicate-observations.json before importing.')
profiles=json.loads((ROOT/'data/private/survey-file-catalogue.json').read_text()) if (ROOT/'data/private/survey-file-catalogue.json').exists() else []
archives=[]
for entry in json.loads((ROOT/'migration/archive-inventory.json').read_text()):
 path=ROOT/'Track 1 - Agricultural Productivity'/entry['archive'];year=int(re.search(r'20\d\d',entry['archive']).group());files=[f for f in profiles if f['archive']==entry['archive']]
 family='Seasonal Agriculture Survey' if 'Seasonal Agriculture' in entry['archive'] else 'Agriculture Household Survey' if 'Household' in entry['archive'] else 'Food Security and Vulnerability Analysis'
 archives.append({'id':'archive-'+sha(path)[:20],'name':entry['archive'],'family':family,'year':year,'file_count':len(entry['files']),'profiled_files':sum(f['status']=='profiled' for f in files),'variable_count':sum(len(f['variables']) for f in files),'formats':sorted({pathlib.PurePosixPath(f['name']).suffix.lstrip('.') for f in entry['files']}),'bytes':path.stat().st_size,'sha256':sha(path),'status':'profiled' if files else 'catalogued','notes':'All source files retained locally; schemas and sample-record counts indexed. Repeated formats are not independent samples. Respondent records are not treated as district population estimates; charts use published weighted estimates.','created_date':STAMP})
records=[]
reports_path=ROOT/'data/private/published-report-index.json'
reports=json.loads(reports_path.read_text(encoding='utf-8')) if reports_path.exists() else {'reports':[],'pages':[]}
for entity,items in [('Dataset',datasets),('AgriculturalObservation',observations),('ImportLog',logs),('SourceArchive',archives),('SourceTableIndex',indexes),('SourceTable',tables),('SurveyFile',profiles),('SourceReportIndex',reports['reports']),('SourceReportPage',reports['pages'])]:
 records.extend({'entity':entity,'id':item['id'],'data':item,'published':entity in ['Dataset','AgriculturalObservation','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage']} for item in items)
(ROOT/'data/private/local-records.json').write_text(json.dumps(records,ensure_ascii=False),encoding='utf-8')
availability=collections.Counter((o['year'],o['season'],o['crop'],o['aggregation_level']) for o in observations)
options={'crops':sorted({o['crop'] for o in observations}),'mainCrops':sorted({o['crop'] for o in observations if o['aggregation_level']=='main'}),'subtypes':SUBTYPES,'years':sorted({o['year'] for o in observations}),'seasons':sorted({o['season'] for o in observations}),'availability':[{'year':y,'season':s,'crop':c,'level':l,'expected':n} for (y,s,c,l),n in sorted(availability.items())],'tableCount':len(tables),'datasetCount':len(datasets),'observationCount':len(observations)}
(ROOT/'src/data/data-coverage.json').write_text(json.dumps(options,indent=2))
report={'prepared_at':STAMP,'observation_count':len(observations),'datasets':len(datasets),'table_count':len(tables),'archive_count':len(archives),'archive_files':sum(a['file_count'] for a in archives),'profiled_files':sum(a['profiled_files'] for a in archives),'years':options['years'],'seasons':options['seasons'],'crops':options['crops'],'main_crops':options['mainCrops'],'missing_observations':sum(o['value'] is None for o in observations),'normalization_audit':audit,'national_reconciliation':checks,'source_files':[{'name':d['name'],'url':d['source_url'],'sha256':d['sha256']} for d in datasets],'scope_note':'All populated worksheets imported. Every supplied archive catalogued and readable microdata schemas indexed. Charts use published weighted estimates; respondent records remain private.'}
report.update({'report_count':len(reports['reports']),'report_pages':len(reports['pages'])})
(ROOT/'migration/real-data-import-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['normalization_audit','national_reconciliation','source_files']},indent=2))
