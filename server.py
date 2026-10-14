"""Local City Brain prototype. Python 3.10+, no packages required."""
import json
import math
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from urllib.parse import urlencode, urlsplit

ROOT = Path(__file__).resolve().parent
CACHE = {}

def analyze(rows):
    result = []
    for row in rows:
        try:
            speed = float(row['speed'])
            if not math.isfinite(speed) or speed < 0:
                continue
        except (KeyError, ValueError, TypeError):
            continue
        level = '혼잡' if speed < 20 else '서행' if speed < 40 else '원활'
        result.append({**row, 'speed': speed, 'level': level,
                       'recommendation': '현장 확인 후 우회 안내 검토' if speed < 20 else '추가 관측 유지'})
    return sorted(result, key=lambda x: x['speed'])

def normalize(payload):
    header = payload.get('header', payload.get('response', {}).get('header', {}))
    if str(header.get('resultCode', '0')) not in ('0', '00'):
        raise ValueError('provider error')
    body = payload.get('body', payload.get('response', {}).get('body', {}))
    items = body.get('items', [])
    if isinstance(items, dict):
        items = items.get('item', [])
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        raise ValueError('unexpected schema')
    rows = analyze(items)
    now = datetime.now(timezone.utc)
    for row in rows:
        try:
            observed = datetime.strptime(str(row.get('createdDate', '')), '%Y%m%d%H%M%S').replace(tzinfo=timezone(timedelta(hours=9)))
            age = (now - observed).total_seconds()
            row['ageSeconds'] = round(age)
            row['quality'] = '시각 이상' if age < -60 else '노후 관측' if age > 600 else '최근 관측'
        except ValueError:
            row['quality'] = '관측 시각 미확인'
    return rows

def traffic(live=False):
    if not live:
        return {'mode': 'demo', 'source': '합성 시나리오 · 실측 아님', 'fetchedAt': None,
                'rows': analyze(json.loads((ROOT / 'data/demo.json').read_text()))}
    key = os.environ.get('ITS_API_KEY')
    if not key:
        return {'mode': 'unavailable', 'error': '서버에 ITS_API_KEY를 설정해야 합니다.', 'rows': []}
    if CACHE and time.time() - CACHE['time'] < 60:
        return CACHE['value']
    params = {'apiKey': key, 'type': 'all', 'minX': 128.72, 'maxX': 128.94,
              'minY': 35.13, 'maxY': 35.29, 'getType': 'json'}
    # Official ITS example endpoint; provider service availability must be verified with an approved key.
    with urlopen('https://openapi.its.go.kr/trafficInfo?' + urlencode(params), timeout=15) as response:
        rows = normalize(json.load(response))
    value = {'mode': 'live', 'source': 'ITS 국가교통정보센터',
             'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'rows': rows}
    CACHE.update(time=time.time(), value=value)
    return value

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'web'), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path)
        if path.path == '/api/traffic':
            try:
                value = traffic(path.query == 'mode=live')
                status = 200
            except Exception:
                # Never return exception strings: upstream errors can include API keys.
                value = {'mode': 'unavailable', 'error': 'ITS 응답 실패. 인증·서비스 상태를 확인하세요. 모의 데이터로 대체하지 않았습니다.', 'rows': []}
                status = 502
            content = json.dumps(value, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()

if __name__ == '__main__':
    print('City Brain: http://127.0.0.1:8080')
    ThreadingHTTPServer(('127.0.0.1', 8080), Handler).serve_forever()
