"""Local mapping semantics only; no provider access or trade calculations."""
from dataclasses import dataclass
from cn_mapping_v01 import MAPPING, SOURCE

EDITION = 'CN2026_ORIGINAL_ANNEX'
ROLES = frozenset({'DIRECT', 'PROXY', 'CONTEXT'})
EVIDENCE = frozenset({'DOCUMENT_VERIFIED_SCOPED', 'UNVERIFIED'})

@dataclass(frozen=True)
class Relationship:
    crop: str
    code: str
    role: str
    evidence_level: str
    evidence: tuple[str, ...]
    scope: str
    edition: str = EDITION
    jurisdiction: str = 'EU'

    def __post_init__(self):
        for name in ('crop', 'scope', 'edition', 'jurisdiction'):
            value = getattr(self, name)
            if not isinstance(value, str) or not value.strip() or value != value.strip():
                raise ValueError(f'invalid {name}')
        if (not isinstance(self.code, str) or len(self.code) not in (6, 8)
                or not self.code.isascii() or not self.code.isdigit()):
            raise ValueError('exact six/eight digit code required')
        if self.role not in ROLES or self.evidence_level not in EVIDENCE:
            raise ValueError('unsupported role/evidence level')
        if (not isinstance(self.evidence, tuple) or not self.evidence
                or any(not isinstance(e, str) or not e.strip() for e in self.evidence)):
            raise ValueError('immutable evidence references required')
        if len(self.code) == 6 and self.role != 'CONTEXT':
            raise ValueError('six-digit parents are context only in this scope')


def initial_basket(crop):
    """CN prefixes are context within this edition, not a verified HS concordance."""
    if crop not in MAPPING:
        raise ValueError('unmapped crop')
    code, specific = MAPPING[crop]
    return (
        Relationship(crop, code, 'DIRECT' if specific else 'PROXY',
                     'DOCUMENT_VERIFIED_SCOPED', (SOURCE,),
                     'Original annex target scope' if specific else 'Mixed species; target share unknown'),
        Relationship(crop, code[:6], 'CONTEXT', 'DOCUMENT_VERIFIED_SCOPED',
                     (SOURCE,), 'Broader CN parent; no independent HS edition verified'),
    )


def assess_basket(relationships, *, crop, year, edition=EDITION, jurisdiction='EU'):
    """Return semantic eligibility, never licence permission, mass or a signal."""
    rows = tuple(relationships)
    if not rows or any(not isinstance(r, Relationship) for r in rows):
        raise ValueError('nonempty relationship sequence required')
    keys = [(r.crop, r.edition, r.jurisdiction, r.code) for r in rows]
    if len(set(keys)) != len(keys):
        raise ValueError('duplicate relationship')
    if any(r.crop != crop for r in rows):
        raise ValueError('basket crop mismatch')
    decisions = []
    for r in rows:
        scoped = (type(year) is int and year == 2026 and
                  edition == r.edition == EDITION and jurisdiction == r.jurisdiction == 'EU')
        verified = scoped and r.evidence_level == 'DOCUMENT_VERIFIED_SCOPED'
        decisions.append(dict(code=r.code, role=r.role, evidence_level=r.evidence_level,
            evidence=r.evidence, scope=r.scope,
            mapping_allows_code_trend=verified and r.role in ('DIRECT', 'PROXY'),
            mapping_allows_crop_quantity=verified and r.role == 'DIRECT',
            mapping_allows_context=verified and r.role == 'CONTEXT',
            species_share=None, numerical_weight=None,
            reason='SCOPED_MAPPING' if verified else 'UNVERIFIED_SCOPE_OR_EVIDENCE'))
    overlaps = tuple((a.code,b.code) for i,a in enumerate(rows) for b in rows[i+1:]
                     if a.code.startswith(b.code) or b.code.startswith(a.code))
    return dict(crop=crop, relationships=decisions, overlapping_codes=overlaps,
                aggregate_quantity=None, trade_signal=None,
                retrieval_permission='NOT_ASSESSED',
                note='Mapping semantics only. Provider availability, licence, units and coverage require separate checks.')
