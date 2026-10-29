"""Index full official report text for search; never infer district measurements from PDFs."""
import concurrent.futures,datetime,hashlib,json,pathlib,urllib.parse,urllib.request
from pypdf import PdfReader
ROOT=pathlib.Path(__file__).resolve().parents[1]
target=ROOT/'data/private/nisr-reports';target.mkdir(parents=True,exist_ok=True)
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
def index(source):
 url=urllib.parse.urlparse(source['url'])
 if url.scheme!='https' or url.hostname not in ['statistics.gov.rw','www.statistics.gov.rw']:raise ValueError('Unofficial report URL')
 identity='nisr-report-'+hashlib.sha256(source['url'].encode()).hexdigest()[:20];path=target/(identity+'.pdf')
 if not path.exists():
  with urllib.request.urlopen(source['url'],timeout=90) as response:
   final=urllib.parse.urlparse(response.url)
   if final.scheme!='https' or final.hostname not in ['statistics.gov.rw','www.statistics.gov.rw']:raise ValueError('Unofficial redirect')
   raw=response.read(30*1024*1024+1)
  if len(raw)>30*1024*1024 or not raw.startswith(b'%PDF'):raise ValueError('Expected a PDF under 30 MB')
  path.write_bytes(raw)
 reader=PdfReader(path)
 name=urllib.parse.unquote(pathlib.PurePosixPath(url.path).name)
 meta={**source,'id':identity,'name':name,'source_url':source['url'],'page_count':len(reader.pages),'retrieval_date':stamp[:10],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'created_date':stamp}
 pages=[{'id':identity+'-page-'+str(i+1),'report_id':identity,'page':i+1,'text':page.extract_text() or '', 'source_url':source['url']+'#page='+str(i+1)} for i,page in enumerate(reader.pages)]
 print(source['family']+' '+str(source['year'])+': '+name+'; '+str(len(pages))+' pages',flush=True)
 return meta,pages
reports=[];pages=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for meta,content in pool.map(index,json.loads((ROOT/'migration/nisr-report-manifest.json').read_text())):
  reports.append(meta);pages.extend(content)
(ROOT/'data/private/published-report-index.json').write_text(json.dumps({'reports':reports,'pages':pages},ensure_ascii=False),encoding='utf-8')
print(json.dumps({'reports':len(reports),'pages':len(pages)}))
