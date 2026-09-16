"""Research scope only: original CN 2026 annex, no customs ruling."""
MAPPING = {
    'red_clover': ('12092210', True),
    'white_clover': ('12092280', False),
    'italian_ryegrass': ('12092510', True),
    'perennial_ryegrass': ('12092590', True),
    'vetch': ('12092945', False),
    'flax_for_sowing': ('12040010', True),
}
SOURCE = 'https://eur-lex.europa.eu/eli/reg_impl/2025/1926/oj/eng'

def assess(target, code, year):
    result = dict(eligible_for_target_statistics=False, source=SOURCE,
                  edition='CN2026_ORIGINAL_ANNEX', later_amendments_checked=False)
    if type(year) is not int or year != 2026:
        return dict(result, reason='UNVERIFIED_YEAR')
    if not isinstance(target, str) or target not in MAPPING:
        return dict(result, reason='UNMAPPED_TARGET')
    if not isinstance(code, str) or len(code) != 8 or not code.isascii() or not code.isdigit():
        return dict(result, reason='EXACT_CN8_REQUIRED')
    expected, precise = MAPPING[target]
    if code != expected:
        return dict(result, reason='TARGET_CODE_MISMATCH')
    if not precise:
        return dict(result, reason='MIXED_SPECIES_CODE', cn8=code, hs6_parent=code[:6])
    return dict(result, eligible_for_target_statistics=True,
                reason='MATCHES_ORIGINAL_ANNEX_SCOPE', cn8=code, hs6_parent=code[:6])
