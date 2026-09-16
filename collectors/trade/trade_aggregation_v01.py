"""Explicit, complete-child aggregation. Mapping evidence is caller supplied."""
from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal
import re
from trade_observation_v01 import TradeObservation


@dataclass(frozen=True)
class AggregationMap:
    cn_edition: str
    hs_edition: str
    hs_code: str
    children: tuple[str, ...]
    valid_from: str
    valid_to: str
    evidence: tuple[str, ...]

    def __post_init__(self):
        for value in (self.cn_edition, self.hs_edition):
            if not isinstance(value, str) or not value.strip() or value == 'UNKNOWN':
                raise ValueError('verified editions required')
        if not re.fullmatch(r'[0-9]{6}', self.hs_code):
            raise ValueError('HS6 required')
        if (not isinstance(self.children, tuple) or not self.children
                or len(set(self.children)) != len(self.children)
                or any(not re.fullmatch(self.hs_code + r'[0-9]{2}', c) for c in self.children)):
            raise ValueError('unique compatible CN8 children required')
        if (not isinstance(self.evidence, tuple) or not self.evidence
                or any(not isinstance(e, str) or not e.strip() or e == 'UNKNOWN' for e in self.evidence)):
            raise ValueError('complete-child concordance evidence required')
        if date.fromisoformat(self.valid_from) > date.fromisoformat(self.valid_to):
            raise ValueError('invalid validity interval')


@dataclass(frozen=True)
class AggregateResult:
    observation: TradeObservation
    inputs: tuple[TradeObservation, ...]
    mapping: AggregationMap
    kind: str = 'DERIVED_CN8_TO_HS6'


def aggregate_cn8(rows, mapping: AggregationMap) -> AggregateResult:
    """Reject incomplete partitions; never infer missing children as zero.

    Evidence references attest the supplied child universe; this function does
    not independently authenticate their contents. No built-in real mapping.
    """
    rows = tuple(rows)
    if not rows:
        raise ValueError('empty input')
    codes = [r.product_code for r in rows]
    if len(set(codes)) != len(codes):
        raise ValueError('duplicate child or mixed vintages')
    if set(codes) != set(mapping.children):
        raise ValueError('incomplete or overlapping child partition')
    first = rows[0]
    # All non-product metadata must agree, including vintage and retrieval
    # capture. Deliberately refuse accidental merging of distinct snapshots.
    excluded = {'product_code', 'product_description', 'weight', 'quantity',
                'trade_value', 'provenance'}
    for row in rows:
        if row.product_code_system != 'CN' or row.product_code_edition != mapping.cn_edition:
            raise ValueError('incompatible nomenclature')
        if row.status != 'OBSERVED':
            raise ValueError('unavailable or confidential child')
        if row.source_vintage == 'UNKNOWN':
            raise ValueError('unknown vintage')
        month = date.fromisoformat(row.period + '-01')
        # Require the complete reporting month to fall within validity.
        end = date(month.year + (month.month == 12), month.month % 12 + 1, 1)
        from datetime import timedelta
        if month < date.fromisoformat(mapping.valid_from) or end - timedelta(days=1) > date.fromisoformat(mapping.valid_to):
            raise ValueError('period outside mapping validity')
        for field in row.__dataclass_fields__:
            if field not in excluded and getattr(row, field) != getattr(first, field):
                raise ValueError('incompatible ' + field)

    def total(field, definitions):
        values = [getattr(r, field) for r in rows]
        if any(v is None for v in values) or any(getattr(first, d) == 'UNKNOWN' for d in definitions):
            return None
        return sum(values, Decimal(0))

    derived = replace(first, product_code_system='HS', product_code_edition=mapping.hs_edition,
        product_code=mapping.hs_code, product_description='Complete mapped CN8 aggregate',
        weight=total('weight', ('weight_type', 'weight_unit')),
        quantity=total('quantity', ('supplementary_unit',)),
        trade_value=total('trade_value', ('currency', 'value_basis')),
        provenance=tuple(dict.fromkeys(('DERIVED_CN8_TO_HS6',) + mapping.evidence
                         + tuple(p for r in rows for p in r.provenance))))
    return AggregateResult(derived, rows, mapping)
