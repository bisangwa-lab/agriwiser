"""Compatibility entry point for the complete published-data importer."""
import pathlib, runpy
runpy.run_path(str(pathlib.Path(__file__).with_name('prepare-full-data.py')), run_name='__main__')
