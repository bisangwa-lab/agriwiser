"""Discover official historical survey workbooks; never infer download URLs."""
import concurrent.futures, html, json, pathlib, re, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest = ROOT / 'migration/nisr-source-manifest.json'
sources = json.loads(manifest.read_text())
pages = [(year, 'SAS', 'https://statistics.gov.rw/data-sources/surveys/Seasonal-Agricultural-Survey/Seasonal-Agricultural-Survey/seasonal-agricultural-survey-' + str(year)) for year in range(2013, 2024)]
pages += [(year, 'AHS', 'https://statistics.gov.rw/data-sources/surveys/Agricultural-Household-Survey/agricultural-household-survey-' + str(year)) for year in [2017, 2020, 2024]]
pages += [(year, 'CFSVA', 'https://statistics.gov.rw/data-sources/surveys/CFSVA/'+slug) for year,slug in [(2015,'comprehensive-food-security-and-vulnerability-analysis-cfsva-2015'),(2018,'comprehensive-food-security-and-vulnerability-analysis-cfsva-2018'),(2021,'comprehensive-food-security-vulnerability-analysis-cfsva-2022'),(2024,'comprehensive-food-security-vulnerability-analysis-cfsva-2024')]]

def discover(spec):
    year, family, page = spec
    try:
        with urllib.request.urlopen(page, timeout=45) as response:
            text = response.read().decode('utf-8')
        urls = sorted(set(urllib.parse.urljoin(page, html.unescape(url)) for url in re.findall(r'href=[\"\']([^\"\']+\.(?:xlsx?|pdf))(?:\?[^\"\']*)?[\"\']', text, re.I)))
        return spec, urls, None
    except Exception as error:
        return spec, [], str(error)

audit = []; reports=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for (year, family, page), urls, error in pool.map(discover, pages):
        audit.append({'year': year, 'family': family, 'page': page, 'workbooks': urls, 'error': error})
        for i, url in enumerate(urls):
            host = urllib.parse.urlparse(url).hostname
            if host not in ['statistics.gov.rw', 'www.statistics.gov.rw']: raise ValueError(host)
            if urllib.parse.urlparse(url).path.lower().endswith('.pdf'):
                reports.append({'year':year,'family':family,'url':url,'publication_url':page})
                continue
            filename = f'{family}_{year}_Tables' + (f'_{i+1}' if len(urls)>1 else '') + pathlib.PurePosixPath(urllib.parse.urlparse(url).path).suffix
            if not any(source['url'] == url for source in sources):
                sources.append({'filename': filename, 'url': url, 'publication_url': page, 'year': year, 'family': family})
        print(f'{family} {year}: {len(urls)} workbook(s)' + ('; '+error if error else ''), flush=True)
manifest.write_text(json.dumps(sources, indent=2))
(ROOT/'migration/source-discovery-report.json').write_text(json.dumps(audit, indent=2))
(ROOT/'migration/nisr-report-manifest.json').write_text(json.dumps(reports,indent=2))
