"""Read every supplied file's schema without publishing respondent records."""
import csv, io, json, pathlib, re, sys, tempfile, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'data/private/python-packages'))
import pyreadstat

out = ROOT/'data/private/survey-file-catalogue.json'
cache = {row['id']: row for row in json.loads(out.read_text())} if out.exists() else {}
files = []
for archive in sorted((ROOT/'Track 1 - Agricultural Productivity').glob('*.zip')):
    with zipfile.ZipFile(archive) as zipped:
        for item in zipped.infolist():
            if item.is_dir(): continue
            ext = pathlib.PurePosixPath(item.filename).suffix.lower()
            identity = 'survey-file-' + __import__('hashlib').sha256((archive.name+'|'+item.filename+'|'+str(item.CRC)+'|'+str(item.file_size)).encode()).hexdigest()[:24]
            if identity in cache and cache[identity]['status']!='needs_review':
                files.append(cache[identity]); continue
            record = {'id': identity, 'archive': archive.name, 'name': item.filename, 'year': int(re.search(r'20\d\d',archive.name).group()), 'format': ext.lstrip('.'), 'bytes': item.file_size, 'crc32': item.CRC, 'status': 'metadata', 'variables': [], 'row_count': None}
            try:
                if '__MACOSX/' in item.filename or pathlib.PurePosixPath(item.filename).name.startswith('._'):
                    record['status']='operating_system_metadata'
                elif ext in ['.dta', '.sav']:
                    with tempfile.TemporaryDirectory(dir=ROOT/'data/private') as folder:
                        path = pathlib.Path(folder)/('survey'+ext)
                        with zipped.open(item) as source, path.open('wb') as target:
                            __import__('shutil').copyfileobj(source, target)
                        reader = pyreadstat.read_dta if ext=='.dta' else pyreadstat.read_sav
                        try:
                            _, meta = reader(str(path), metadataonly=True)
                        except UnicodeDecodeError:
                            _, meta = reader(str(path), metadataonly=True, encoding='latin1')
                        except pyreadstat.ReadstatError:
                            # Some supplied files carry the wrong extension.
                            alternative = pyreadstat.read_dta if ext=='.sav' else pyreadstat.read_sav
                            _, meta = alternative(str(path), metadataonly=True)
                            record['detected_format'] = 'dta' if ext=='.sav' else 'sav'
                    record['row_count'] = meta.number_rows
                    record['variables'] = [{'name': name, 'label': label or name, 'type': meta.readstat_variable_types.get(name)} for name,label in zip(meta.column_names,meta.column_labels)]
                    record['status'] = 'profiled'
                elif ext=='.csv':
                    with zipped.open(item) as source:
                        stream=io.TextIOWrapper(source,encoding='utf-8-sig',errors='replace',newline='')
                        rows=csv.reader(stream)
                        record['variables']=[{'name': name,'label':name,'type':'CSV'} for name in next(rows)]
                        record['row_count']=sum(1 for _ in rows)
                    record['status']='profiled'
            except Exception as error:
                record['status']='needs_review'; record['error']=str(error)[:300]
            files.append(record)
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(files,ensure_ascii=False))
    print(archive.name+': '+str(sum(f['archive']==archive.name for f in files))+' file schemas indexed',flush=True)
print(json.dumps({'files':len(files),'profiled':sum(f['status']=='profiled' for f in files),'needs_review':sum(f['status']=='needs_review' for f in files),'variables':sum(len(f['variables']) for f in files)}))
