"""Download the fixed, reviewed NISR releases in the source manifest using HTTPS."""
from pathlib import Path
import json,urllib.request,urllib.parse
root=Path(__file__).resolve().parents[1]
sources=json.loads((root/'migration/nisr-source-manifest.json').read_text())
target=root/'data/private/nisr'
target.mkdir(parents=True,exist_ok=True)
for source in sources:
 url=urllib.parse.urlparse(source['url'])
 if url.scheme!='https' or url.hostname not in ['statistics.gov.rw','www.statistics.gov.rw']:
  raise ValueError('Only official NISR HTTPS downloads are allowed.')
 filename=source['filename']
 if Path(filename).name!=filename or not filename.endswith(('.xlsx','.xls')): raise ValueError('Invalid filename.')
 path=target/filename
 if path.exists():
  print('Retained',filename); continue
 with urllib.request.urlopen(source['url'],timeout=90) as response:
  final=urllib.parse.urlparse(response.url)
  if final.scheme!='https' or final.hostname not in ['statistics.gov.rw','www.statistics.gov.rw']: raise ValueError('Unexpected download redirect.')
  raw=response.read(5*1024*1024+1)
 if len(raw)>5*1024*1024 or not (raw.startswith(b'PK') or raw.startswith(bytes.fromhex('d0cf11e0'))): raise ValueError('Expected an Excel workbook under 5 MB.')
 path.write_bytes(raw)
 print('Downloaded',filename,len(raw),'bytes')
