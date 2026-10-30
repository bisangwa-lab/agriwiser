# Commands for agent to run **inside the target repository**, not this kit

```powershell
# Windows PowerShell — after reviewing repo and setting authorized local data paths
python scripts/inspect-surveys.py
python scripts/profile-survey-archives.py
python scripts/discover-nisr-sources.py
python scripts/download-nisr-data.py
python scripts/index-published-reports.py
python scripts/prepare-real-data.py
node scripts/import-local-data.js
node scripts/check-real-data.js
```

Some steps need network access, approved datasets and Python packages. Check `LOCAL_DATA.md` and current repo scripts first. A failed download is a blocker to document, not permission to generate substitute values. Local archives and respondent files must remain outside public git and browser assets.
