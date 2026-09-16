"""Immutable canonical research observations; no network or source adapters."""
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
import re

UNKNOWN = 'UNKNOWN'

@dataclass(frozen=True)
class TradeObservation:
    source: str
    source_dataset: str
    source_vintage: str
    retrieved_at: str
    reporter: str
    partner: str
    flow: str
    period: str
    product_code_system: str
    product_code_edition: str
    product_code: str
    product_description: str
    weight: Decimal | None
    weight_type: str
    quantity: Decimal | None
    supplementary_unit: str
    trade_value: Decimal | None
    currency: str
    value_basis: str
    status: str
    provenance: tuple[str, ...]
    weight_unit: str = 'kg'
    partner_definition: str = UNKNOWN
    trade_system: str = UNKNOWN
    customs_scope: str = UNKNOWN
    transport_scope: str = UNKNOWN
    partner2_scope: str = UNKNOWN
    methodology: str = UNKNOWN
    published_at: str = UNKNOWN

    def __post_init__(self):
        for field in self.__dataclass_fields__:
            value = getattr(self, field)
            if field in ('weight','quantity','trade_value'):
                if value is not None and (not isinstance(value,Decimal) or not value.is_finite() or value < 0):
                    raise ValueError(f'{field} requires finite nonnegative Decimal or None')
            elif field == 'provenance':
                if not isinstance(value,tuple) or not value or any(not isinstance(x,str) or not x.strip() for x in value):
                    raise ValueError('immutable provenance references required')
            elif not isinstance(value,str) or not value.strip() or value != value.strip():
                raise ValueError(f'invalid {field}; use explicit UNKNOWN when unknown')
        if not re.fullmatch(r'\d{4}-\d{2}',self.period):
            raise ValueError('monthly YYYY-MM required')
        date.fromisoformat(self.period+'-01')
        stamp=datetime.fromisoformat(self.retrieved_at.replace('Z','+00:00'))
        if stamp.tzinfo is None: raise ValueError('retrieval timestamp needs timezone')
        if self.flow not in ('IMPORT','EXPORT','RE_EXPORT'): raise ValueError('invalid flow')
        if self.product_code_system not in ('CN','HS'): raise ValueError('unsupported code system')
        size=8 if self.product_code_system=='CN' else 6
        if len(self.product_code)!=size or not self.product_code.isascii() or not self.product_code.isdigit():
            raise ValueError('invalid code format')
        if self.status not in ('OBSERVED','MISSING','CONFIDENTIAL','SUPPRESSED','UNKNOWN'):
            raise ValueError('unsupported status')

    @property
    def key(self):
        return tuple(getattr(self,k) for k in ('source','source_dataset','source_vintage',
            'reporter','partner','flow','period','product_code_system','product_code_edition',
            'product_code','customs_scope','transport_scope','partner2_scope'))
