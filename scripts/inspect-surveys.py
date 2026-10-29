import pathlib,zipfile,collections,json
root=pathlib.Path('Track 1 - Agricultural Productivity')
result=[]
counts=collections.Counter()
for p in sorted(root.glob('*.zip')):
    with zipfile.ZipFile(p) as z:
        entries=[i for i in z.infolist() if not i.is_dir()]
        counts.update(pathlib.Path(i.filename).suffix.lower() for i in entries)
        result.append({'archive':p.name,'files':[{'name':i.filename,'bytes':i.file_size} for i in entries]})
pathlib.Path('migration/archive-inventory.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'file_count':sum(counts.values()),'extensions':counts,'recent':[r for r in result if '2024.zip' in r['archive'] or '2025.zip' in r['archive']]},indent=2))
