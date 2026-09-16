"""Directional research comparison: percent difference relative to reference."""
from decimal import Decimal
from trade_observation_v01 import TradeObservation, UNKNOWN

BASE = ('reporter','partner','flow','period','product_code_system','product_code_edition',
        'product_code','partner_definition','trade_system','customs_scope','transport_scope',
        'partner2_scope','methodology')

def _reasons(a,b,fields):
    result=[]
    for field in fields:
        left,right=getattr(a,field),getattr(b,field)
        if UNKNOWN in (left,right): result.append('UNKNOWN_'+field)
        elif left!=right: result.append('DIFFERENT_'+field)
    return result

def _metric(reference,candidate,name,fields):
    reasons=_reasons(reference,candidate,BASE+fields)
    if reference.status!='OBSERVED' or candidate.status!='OBSERVED': reasons.append('NON_OBSERVED_STATUS')
    a,b=getattr(reference,name),getattr(candidate,name)
    if a is None or b is None: reasons.append('MISSING_'+name)
    if reasons: return dict(status='NOT_COMPARABLE',reasons=reasons,difference=None,percent=None)
    delta=b-a
    if a==0:
        if b==0: return dict(status='MATCH',reasons=[],difference=Decimal(0),percent=Decimal(0))
        return dict(status='NOT_COMPARABLE',reasons=['ZERO_REFERENCE_DENOMINATOR'],difference=delta,percent=None)
    pct=abs(delta)/abs(a)*100
    status='MATCH' if pct<2 else 'ACCEPTABLE' if pct<=5 else 'WARNING' if pct<=10 else 'CONFLICT'
    return dict(status=status,reasons=[],difference=delta,percent=pct)

def compare(reference,candidate):
    if not isinstance(reference,TradeObservation) or not isinstance(candidate,TradeObservation):
        raise TypeError('TradeObservation required')
    metrics={
        'weight':_metric(reference,candidate,'weight',('weight_type','weight_unit')),
        'trade_value':_metric(reference,candidate,'trade_value',('currency','value_basis')),
    }
    flags=[]
    if reference.source==candidate.source: flags.append('SAME_SOURCE_NOT_INDEPENDENT')
    if UNKNOWN in (reference.source_vintage,candidate.source_vintage): flags.append('UNKNOWN_VINTAGE')
    elif reference.source_vintage!=candidate.source_vintage: flags.append('DIFFERENT_VINTAGES_REVIEW_REVISIONS')
    flags.append('UPSTREAM_INDEPENDENCE_NOT_ESTABLISHED')
    statuses=[m['status'] for m in metrics.values()]
    rank={'MATCH':0,'ACCEPTABLE':1,'WARNING':2,'CONFLICT':3,'NOT_COMPARABLE':4}
    return dict(status=max(statuses,key=rank.get),metrics=metrics,flags=flags,
        reference_key=reference.key,candidate_key=candidate.key,
        threshold_policy='Exploratory: <2 MATCH, 2-5 ACCEPTABLE, >5-10 WARNING, >10 CONFLICT; not business rules',
        direction='candidate minus reference; absolute percent relative to reference')
