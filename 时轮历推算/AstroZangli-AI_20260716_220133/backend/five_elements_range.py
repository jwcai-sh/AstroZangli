"""Bounded, offline comparison of versioned Python and website snapshots."""

from scripts.seed_python_compare_db import fingerprint
from matlab_final_runtime import FINAL_SOURCE_PATH
from five_elements_compare_store import FiveElementsCompareStore

FIELDS = {'定曜': 6, '月伴星宿': 6, '定日': 5, '会合': 6}


def valid_days(payload):
    if not payload or payload.get('available') is False:
        return False
    days = payload.get('days', [])
    return (len(days) == 30 and [d.get('day') for d in days] == list(range(1, 31))
            and all(isinstance(d.get(k), list) and len(d[k]) == size
                    and all(type(v) is int for v in d[k])
                    for d in days for k, size in FIELDS.items()))


def compare_range(start, end, month=None, store=None):
    if not 1 <= start <= end <= 2500:
        raise ValueError('年份必须在 1–2500 内，起始年不晚于结束年')
    if month is not None and (start != end or not 1 <= month <= 12):
        raise ValueError('日期明细必须指定单个年份和 1–12 月')
    store = store or FiveElementsCompareStore()
    hashes = fingerprint()
    years = []
    stats = {
        'monthCount': 0,
        'matchedMonths': 0,
        'differentMonths': 0,
        'unavailableMonths': 0,
        'comparedDays': 0,
        'matchingDays': 0,
        'differentDays': 0,
        'fieldDifferenceCounts': {field: 0 for field in FIELDS},
    }
    for year in range(start, end + 1):
        months = []
        for m in ([month] if month is not None else range(1, 13)):
            python = store.load_month_source(year, m, 'python_final')
            website = store.load_month_source(year, m, 'website')
            reason = ''
            if not valid_days(python):
                reason = 'Python 缓存缺失或不完整'
            elif python.get('sourceHashes') != hashes:
                reason = 'Python 缓存版本过期，需重新预计算'
            elif not valid_days(website):
                reason = '网站缓存缺失或不完整'
            item = {'month': m, 'status': 'unavailable', 'reason': reason, 'differentDays': [], 'days': []}
            if not reason:
                for a, b in zip(python['days'], website['days']):
                    fields = [k for k in FIELDS if a[k] != b[k]]
                    for field in fields:
                        stats['fieldDifferenceCounts'][field] += 1
                    if fields:
                        item['differentDays'].append(a['day'])
                    if month is not None:
                        item['days'].append({'day': a['day'], 'fields': fields,
                                             'python': {k: a[k] for k in FIELDS},
                                             'website': {k: b[k] for k in FIELDS}})
                item['status'] = 'difference' if item['differentDays'] else 'match'
            stats['monthCount'] += 1
            if item['status'] == 'unavailable':
                stats['unavailableMonths'] += 1
            else:
                stats['comparedDays'] += len(python['days'])
                stats['differentDays'] += len(item['differentDays'])
                stats['matchingDays'] += len(python['days']) - len(item['differentDays'])
                stats['matchedMonths' if item['status'] == 'match' else 'differentMonths'] += 1
            months.append(item)
        years.append({'year': year, 'months': months})
    return {'years': years, 'stats': stats, 'engine': FINAL_SOURCE_PATH.name,
            'sourceHashes': hashes, 'offline': True}
