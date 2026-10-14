"""Build directed road links from OSM geometry, splitting at shared nodes."""
import json
import math
from collections import Counter
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

def convert(payload):
    ways = [w for w in payload.get('elements', []) if w.get('type') == 'way' and len(w.get('geometry', [])) >= 2]
    shared = Counter(n for w in ways for n in set(w['nodes']))
    links = []
    for way in ways:
        tags = way.get('tags', {})
        nodes, coords = way['nodes'], way['geometry']
        cuts = [0] + [i for i in range(1, len(nodes)-1) if shared[nodes[i]] > 1] + [len(nodes)-1]
        for start, end in zip(cuts, cuts[1:]):
            geometry = [[p['lat'], p['lon']] for p in coords[start:end+1]]
            length = sum(math.hypot((b[0]-a[0])*111.2, (b[1]-a[1])*91.0) for a,b in zip(geometry,geometry[1:]))
            if length < .015:
                continue
            directions = [1] if tags.get('oneway') in ('yes','1','true') or tags.get('junction') == 'roundabout' else [-1] if tags.get('oneway') == '-1' else [1,-1]
            for direction in directions:
                g = geometry if direction == 1 else list(reversed(geometry))
                links.append({'linkId': f"osm-{way['id']}-{start}-{direction}", 'osmWay': way['id'], 'roadName': tags.get('name', tags.get('highway','도로')),
                    'fromNode': nodes[start if direction == 1 else end], 'toNode': nodes[end if direction == 1 else start],
                    'coordinates': g, 'lat': g[0][0], 'lng': g[0][1], 'length': round(length,4),
                    'freeSpeed': 30 if tags.get('highway') == 'residential' else 50, 'capacity': 30, 'storage': max(8,round(length*120)), 'signal': False})
    for index, link in enumerate(links):
        link['key'] = f'R{index+1:03d}'
        link['next'] = [j for j,other in enumerate(links) if link['toNode'] == other['fromNode'] and link['fromNode'] != other['toNode']]
        link['column'] = 0 if index % 8 == 0 else 1
        link['row'] = index % 6
    if not links:
        raise ValueError('No actual road links returned')
    return {'source':'OpenStreetMap contributors', 'license':'ODbL', 'attributionUrl':'https://www.openstreetmap.org/copyright',
            'scope':'장유 중심권', 'parameters':'Geometry/topology from OSM; speed, capacity, storage and demand are assumed; turn restrictions and signals not imported.', 'links':links}

if __name__ == '__main__':
    query = '[out:json][timeout:30];way[highway~"^(primary|secondary|tertiary|residential)$"](35.192,128.804,35.205,128.823);out geom;'
    request = Request('https://overpass-api.de/api/interpreter', data=urlencode({'data':query}).encode(), headers={'User-Agent':'KoreaCityBrainPrototype/1.0', 'Content-Type':'application/x-www-form-urlencoded'})
    with urlopen(request, timeout=60) as response:
        result = convert(json.load(response))
    Path('web/roads.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    print('Actual OSM directed links:', len(result['links']))
