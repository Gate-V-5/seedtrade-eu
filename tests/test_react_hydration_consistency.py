from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_prerender_uses_hydratable_react_output():
    source = (ROOT / "scripts" / "prerender_static_first.mjs").read_text()
    assert "renderToString" in source
    assert "renderToStaticMarkup" not in source


def test_initial_classes_are_deterministic_without_trailing_whitespace():
    source = (ROOT / "src" / "AppV2.jsx").read_text()
    assert 'footer ? "official-logo footer-logo brand-plate" : "official-logo"' in source
    assert 'open ? "topbar menu-open" : "topbar"' in source


def test_static_first_routes_keep_meaningful_content_and_hydration_markers():
    for relative in (
        "index.html",
        "market/index.html",
        "buying-requests/index.html",
        "buying-requests/flax-ls-riviera-c2-100t/index.html",
        "methodology/index.html",
    ):
        html = (ROOT / "dist" / relative).read_text()
        assert '<div id="root"><header' in html
        assert "SeedTrade" in html
        assert "<!-- -->" in html
        assert '<div id="root"></div>' not in html
