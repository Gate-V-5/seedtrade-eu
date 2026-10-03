"""Reproduce public-source page/table extraction from raw files in the recovery ZIP."""
import argparse,json,pathlib
from html.parser import HTMLParser
from pypdf import PdfReader
class Tables(HTMLParser):
 def __init__(self):super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None
 def handle_starttag(self,t,a):
  if t=='table':self.table=[]
  if t=='tr':self.row=[]
  if t in ('td','th'):self.cell=''
 def handle_data(self,d):
  if self.cell is not None:self.cell+=d
 def handle_endtag(self,t):
  if t in ('td','th') and self.cell is not None:self.row.append(' '.join(self.cell.split()));self.cell=None
  if t=='tr' and self.row is not None:
   if self.table is not None:self.table.append(self.row)
   self.row=None
  if t=='table' and self.table is not None:self.tables.append(self.table);self.table=None
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('raw',type=pathlib.Path);args=parser.parse_args();raw=args.raw
 for name,pages in [('semae-integrale-24-25.pdf',range(74,80)),('piorin-2025.pdf',range(77,82))]:
  reader=PdfReader(raw/name)
  for page in pages:(raw/(name+'.page-%03d.txt'%(page+1))).write_text(reader.pages[page].extract_text() or '')
 tables=Tables();tables.feed((raw/'lelf-seed.html').read_text());(raw/'lelf-tables-reproduced.json').write_text(json.dumps(tables.tables,ensure_ascii=False,indent=2)+'\n')
 print('Extracted table evidence. Visually inspect original PDF pages before changing accepted rows; never silently repair printed contradictions.')
