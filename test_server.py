import unittest
from unittest.mock import patch
import tempfile
import os
import json
from pathlib import Path
from collect_snapshot import collect
from server import analyze, normalize, traffic

class Tests(unittest.TestCase):
    def test_invalid_and_thresholds(self):
        rows = analyze([{'speed': v} for v in [19, 20, 40, -1, 'bad', 'NaN']])
        self.assertEqual([r['level'] for r in rows], ['혼잡', '서행', '원활'])
    def test_provider_single_item(self):
        self.assertEqual(len(normalize({'body': {'items': {'item': {'speed': '12'}}}})), 1)
    def test_provider_error(self):
        with self.assertRaises(ValueError):
            normalize({'header': {'resultCode': '99'}})
    def test_demo_explicit(self):
        self.assertEqual(traffic()['mode'], 'demo')
    def test_snapshot_excludes_provider_extra_fields(self):
        original = os.getcwd()
        try:
            with tempfile.TemporaryDirectory() as directory:
                os.chdir(directory)
                Path('web').mkdir()
                with patch('collect_snapshot.traffic', return_value={'mode':'live', 'rows':[{'speed':12,'apiKey':'secret','url':'secret'}]}):
                    collect()
                self.assertEqual(json.loads(Path('web/traffic-live.json').read_text())['rows'], [{'speed':12}])
        finally:
            os.chdir(original)

if __name__ == '__main__':
    unittest.main()
