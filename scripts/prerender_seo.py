#!/usr/bin/env python3
"""Create unique SEO route shells and fail-closed noindex private shells."""
from __future__ import annotations
import html, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/"dist"
market=json.loads((ROOT/"src/generated/market_public.json").read_text())
insights=json.loads((ROOT/"src/generated/insights.json").read_text())
news=json.loads((ROOT/"src/generated/news.json").read_text())

routes=[
 ("market","EU Seed Market Dashboard","Representative prices and trade volumes for eleven European seed categories.",True),
 ("methodology","SeedTrade data methodology","How SeedTrade validates official trade data, representative prices and evidence status.",True),
 ("about","About SeedTrade","EU Seed Market Intelligence for professional market participants.",True),
 ("privacy","Privacy Policy","SeedTrade privacy information.",True),
 ("terms","Terms of Use","SeedTrade terms of use.",True),
 ("confidentiality","Commercial Confidentiality","How commercially sensitive information is controlled.",True),
 ("disclaimer","Market Intelligence Disclaimer","Important limitations of derived market intelligence.",True),
 ("insights","Research & Partner Insights","European seed research, events and transparently labelled partner insights.",True),
 ("news","Daily Seed Market News","Verified, source-linked developments across the European seed chain.",True),
 ("buying-requests","Active Buying Requests","Verified PUBLIC_SAFE seed buying requests; sensitive company and contact details remain private.",True),
]
routes += [(f"market/{c['slug']}",f"{c['crop']} market data",f"Representative price, trade volume and evidence status for {c['crop']}.",True) for c in market["crops"]]
routes += [(f"insights/{a['slug']}",a["seo"]["title"],a["seo"]["description"],True) for a in insights["articles"]]
routes += [(f"news/{n['slug']}",f"{n['headline']} | SeedTrade.eu",n["summary"],True) for n in news["items"]]
routes += [(p,"SeedTrade private application","Private application route.",False) for p in ("rfq","offer","account","admin")]
article_by_route={f"insights/{a['slug']}":a for a in insights["articles"]}
news_by_route={f"news/{n['slug']}":n for n in news["items"]}
crop_by_route={f"market/{c['slug']}":c for c in market["crops"]}

def replace_tag(page,pattern,replacement):
 return re.sub(pattern,replacement,page,count=1,flags=re.I|re.S)

source=(DIST/"index.html").read_text(encoding="utf-8")
for path,title,description,indexable in routes:
 canonical=f"https://seedtrade.eu/{path}"
 page=replace_tag(source,r"<title>.*?</title>",f"<title>{html.escape(title)}</title>")
 page=replace_tag(page,r'<meta\s+name="description"[^>]*>',f'<meta name="description" content="{html.escape(description,quote=True)}">')
 page=replace_tag(page,r'<meta\s+name="robots"[^>]*>',f'<meta name="robots" content="{"index,follow" if indexable else "noindex,nofollow"}">')
 page=replace_tag(page,r'<link\s+rel="canonical"[^>]*>',f'<link rel="canonical" href="{canonical}">')
 page=replace_tag(page,r'<meta\s+property="og:title"[^>]*>',f'<meta property="og:title" content="{html.escape(title,quote=True)}">')
 page=replace_tag(page,r'<meta\s+property="og:description"[^>]*>',f'<meta property="og:description" content="{html.escape(description,quote=True)}">')
 page=replace_tag(page,r'<meta\s+property="og:url"[^>]*>',f'<meta property="og:url" content="{canonical}">')
 structured=[]
 if path=="market" or path in crop_by_route:
  crop=crop_by_route.get(path)
  structured.append({"@context":"https://schema.org","@type":"Dataset","name":title,"description":description,"url":canonical,"creator":{"@type":"Organization","name":"SeedTrade.eu"},"isBasedOn":"Eurostat COMEXT DS-045409","temporalCoverage":crop["latest_completed_period"] if crop else market["latest_completed_period"],"license":"https://ec.europa.eu/eurostat/about-us/policies/copyright"})
 if path in article_by_route:
  a=article_by_route[path]; structured.append({"@context":"https://schema.org","@type":a["seo"]["structured_data_type"],"name":a["title"],"headline":a["title"],"description":a["summary"],"datePublished":a["publication_date"],"dateModified":a.get("updated_date",a["publication_date"]),"url":a["seo"]["canonical"],"publisher":{"@type":"Organization","name":"SeedTrade.eu"}})
 if path in news_by_route:
  n=news_by_route[path]; structured.append({"@context":"https://schema.org","@type":"NewsArticle","headline":n["headline"],"description":n["summary"],"datePublished":n["publication_date"],"url":n["canonical_url"],"publisher":{"@type":"Organization","name":"SeedTrade.eu"}})
 for item in structured:
  data=json.dumps(item,ensure_ascii=False).replace("</","<\\/")
  page=page.replace("</head>",f'<script type="application/ld+json">{data}</script></head>')
 target=DIST/path/"index.html"; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(page,encoding="utf-8")
print(f"prerendered {sum(1 for r in routes if r[3])} public routes and 4 noindex private routes")
