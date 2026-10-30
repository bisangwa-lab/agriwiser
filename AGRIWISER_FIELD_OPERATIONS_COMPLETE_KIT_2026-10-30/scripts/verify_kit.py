from pathlib import Path
import csv,json,sys
root=Path(__file__).resolve().parent.parent
required=['README.md','agent/MASTER_IMPLEMENTATION_PROMPT.md','docs/REPOSITORY_AUDIT.md','docs/NISR_DATA_CONTRACT.md','data/NISR_WORKBOOK_SOURCE_CATALOG.json','overlay/src/components/dashboard/FieldDashboard.jsx','overlay/src/lib/field-ops-model.js','overlay/tests/field-ops-model.test.js','tests/ACCEPTANCE_MATRIX.csv','schemas/0004_field_workflow_PROPOSAL.sql']
errors=[]
for p in required:
 if not (root/p).is_file(): errors.append('Missing '+p)
with (root/'data/NISR_WORKBOOK_SOURCE_CATALOG.json').open(encoding='utf-8') as f:
 items=json.load(f)
if len(items)!=17:errors.append('Expected 17 source references in reviewed manifest snapshot')
for item in items:
 if not item['url'].startswith('https://statistics.gov.rw/'):errors.append('Non-official catalogue URL')
(root/'tests').mkdir(exist_ok=True)
with (root/'tests/ACCEPTANCE_MATRIX.csv').open(encoding='utf-8') as f:
 tests=list(csv.DictReader(f))
if len(tests)<35: errors.append('Acceptance matrix incomplete')
if errors:
 print('KIT FAILED:', *errors, sep='\n - '); sys.exit(1)
print(f'KIT STRUCTURE OK — {len(items)} workbook references; {len(tests)} acceptance checks; {sum(1 for x in root.rglob("*") if x.is_file())} files.')
