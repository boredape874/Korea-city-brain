"""Publish only allowlisted traffic fields, never credentials or upstream URLs."""
import json
from pathlib import Path
from server import traffic

def collect():
    try:
        snapshot = traffic(live=True)
        if snapshot['mode'] == 'live':
            allowed = ('linkId', 'roadName', 'speed', 'createdDate', 'level', 'recommendation', 'quality', 'ageSeconds')
            snapshot['rows'] = [{k: row[k] for k in allowed if k in row} for row in snapshot['rows']]
        else:
            snapshot['error'] = 'ITS 인증키가 설정되지 않았습니다. 저장소 Actions secret ITS_API_KEY를 설정하세요.'
    except Exception:
        snapshot = {'mode': 'unavailable', 'rows': [], 'error': '공식 ITS 데이터 수집 실패. 인증·서비스 상태를 확인하세요.'}
    Path('web/traffic-live.json').write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf-8')
    print('Traffic snapshot prepared: ' + snapshot['mode'])

if __name__ == '__main__':
    collect()
