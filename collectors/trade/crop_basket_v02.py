"""Versioned basket semantics; no provider permission or quantity calculation."""
from dataclasses import dataclass
from datetime import date, timedelta
import re


@dataclass(frozen=True)
class Relationship:
    crop: str
    code_system: str
    edition: str
    jurisdiction: str
    code: str
    description: str
    role: str
    evidence_quality: str
    evidence: tuple[str, ...]
    valid_from: str
    valid_to: str
    inclusions: tuple[str, ...]
    exclusions: tuple[str, ...]

    def __post_init__(self):
        for name in ('crop', 'edition', 'jurisdiction', 'description'):
            value = getattr(self, name)
            if not isinstance(value, str) or not value.strip() or value != value.strip():
                raise ValueError('invalid ' + name)
        if self.code_system not in ('CN', 'HS'):
            raise ValueError('unsupported code system')
        if not isinstance(self.code, str) or not re.fullmatch(r'[0-9]{6}([0-9]{2})?', self.code):
            raise ValueError('invalid code')
        if self.code_system == 'HS' and len(self.code) != 6:
            raise ValueError('HS6 required')
        if self.role not in ('DIRECT', 'PROXY', 'CONTEXT'):
            raise ValueError('invalid role')
        if self.code_system == 'CN' and len(self.code) == 6 and self.role != 'CONTEXT':
            raise ValueError('CN parent is context only')
        if self.evidence_quality not in ('DOCUMENT_VERIFIED_SCOPED', 'UNVERIFIED', 'UNKNOWN'):
            raise ValueError('invalid evidence quality')
        for name in ('evidence', 'inclusions', 'exclusions'):
            value = getattr(self, name)
            if (not isinstance(value, tuple) or not value
                    or any(not isinstance(v, str) or not v.strip() for v in value)):
                raise ValueError('explicit immutable ' + name + ' required; use UNKNOWN')
        for value in (self.valid_from, self.valid_to):
            if value != 'UNKNOWN': date.fromisoformat(value)
        if 'UNKNOWN' not in (self.valid_from, self.valid_to) and self.valid_from > self.valid_to:
            raise ValueError('invalid validity interval')


def assess_basket(relationships, *, crop, period, edition, jurisdiction, code_system):
    if not re.fullmatch(r'[0-9]{4}-[0-9]{2}', period):
        raise ValueError('monthly period required')
    start = date.fromisoformat(period + '-01')
    end = date(start.year + (start.month == 12), start.month % 12 + 1, 1) - timedelta(days=1)
    rows = tuple(relationships)
    if not rows or any(not isinstance(r, Relationship) or r.crop != crop for r in rows):
        raise ValueError('nonempty single-crop basket required')
    keys = [(r.code_system, r.edition, r.jurisdiction, r.code) for r in rows]
    if len(set(keys)) != len(keys): raise ValueError('duplicate relationship')
    decisions = []
    for r in rows:
        verified = (r.edition == edition != 'UNKNOWN' and r.jurisdiction == jurisdiction != 'UNKNOWN'
                    and r.code_system == code_system and r.evidence_quality == 'DOCUMENT_VERIFIED_SCOPED'
                    and 'UNKNOWN' not in r.evidence
                    and 'UNKNOWN' not in (r.valid_from, r.valid_to)
                    and r.valid_from <= start.isoformat() and r.valid_to >= end.isoformat())
        decisions.append(dict(relationship=r, mapping_allows_crop_quantity=verified and r.role == 'DIRECT',
            mapping_allows_code_trend=verified and r.role in ('DIRECT', 'PROXY'),
            mapping_allows_context=verified and r.role == 'CONTEXT',
            species_share=None, numerical_weight=None,
            reason='SCOPED_MAPPING' if verified else 'UNVERIFIED_SCOPE_OR_EVIDENCE'))
    overlaps = tuple((a.code, b.code) for i,a in enumerate(rows) for b in rows[i+1:]
        if a.code_system == b.code_system and a.edition == b.edition and a.jurisdiction == b.jurisdiction
        and (a.code.startswith(b.code) or b.code.startswith(a.code)))
    return dict(relationships=decisions, overlapping_codes=overlaps, aggregate_quantity=None,
        trade_signal=None, retrieval_permission='NOT_ASSESSED',
        cross_system_overlap='UNKNOWN_REQUIRES_CONCORDANCE' if len({r.code_system for r in rows}) > 1 else 'NOT_APPLICABLE')
