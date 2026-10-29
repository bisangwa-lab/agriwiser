import urllib.request,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
meta=json.load(urllib.request.urlopen('https://www.geoboundaries.org/api/current/gbOpen/RWA/ADM2/',timeout=60))
url=meta['simplifiedGeometryGeoJSON']
raw=urllib.request.urlopen(url,timeout=90).read()
data=json.loads(raw)
print('features',len(data['features']),'bytes',len(raw),'properties',[f['properties'] for f in data['features'][:2]])
(root/'src/data').mkdir(exist_ok=True)
(root/'src/data/rwanda-districts.geojson').write_bytes(raw)
meta['retrieved_at']='2026-10-29'
meta['sha256']=hashlib.sha256(raw).hexdigest()
(root/'migration/rwanda-boundaries-source.json').write_text(json.dumps(meta,indent=2))
print([f['properties'].get('shapeName') for f in data['features']])
