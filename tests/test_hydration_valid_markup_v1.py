"""Guard React's prerendered markup against HTML parser repairs before hydration."""

from html.parser import HTMLParser
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
ROUTES = tuple(p.relative_to(ROOT / "dist") for p in (ROOT / "dist").rglob("index.html"))


class HydrationStructure(HTMLParser):
    BLOCKS_THAT_CLOSE_P = {
        "article", "aside", "blockquote", "details", "div", "dl", "fieldset",
        "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header",
        "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.bad_nesting = []

    def handle_starttag(self, tag, attrs):
        if tag in self.BLOCKS_THAT_CLOSE_P and "p" in self.stack:
            self.bad_nesting.append((tag, self.getpos()[0]))
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]


class HydrationValidMarkupV1(unittest.TestCase):
    def test_static_html_matches_first_render_for_all_routes(self):
        result = subprocess.run(
            ["node", "scripts/check_hydration_initial.mjs"], cwd=ROOT,
            capture_output=True, text=True, check=True,
        )
        self.assertGreaterEqual(len(ROUTES), 39)
        self.assertIn(f"{len(ROUTES)} routes: static/client initial render MATCH", result.stdout)

    def test_prerendered_initial_markup_is_html_parser_stable(self):
        self.assertGreaterEqual(len(ROUTES), 39)
        for route in ROUTES:
            with self.subTest(route=route):
                markup = (ROOT / "dist" / route).read_text()
                root = markup.split('<div id="root">', 1)[1].split('</body>', 1)[0]
                parser = HydrationStructure()
                parser.feed(root)
                self.assertEqual([], parser.bad_nesting, "HTML parser will repair block content inside a paragraph before React hydrates")
                self.assertIn("SeedTrade", root)

    def test_evidence_disclosure_kept_and_no_blank_root(self):
        for route in ("index.html", "market/index.html", "market/red-clover/index.html"):
            markup = (ROOT / "dist" / route).read_text()
            self.assertIn("Why this level?", markup)
            self.assertIn("Market Signal", markup)
            self.assertIn("<!-- -->", markup)
            self.assertNotIn('<div id="root"></div>', markup)


if __name__ == "__main__":
    unittest.main()
