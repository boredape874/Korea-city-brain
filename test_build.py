import tempfile
import unittest
from pathlib import Path
from build_static import build

class BuildTests(unittest.TestCase):
    def test_asset_graph_uses_one_content_version(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'dist'
            names = build(Path(__file__).parent / 'web', output)
            html = (output / 'index.html').read_text()
            for name in ('style.css', 'app.js', 'simulation.js'):
                self.assertIn(names[name], html)
                self.assertFalse((output / name).exists())
            self.assertIn(names['batch-worker.js'], (output / names['app.js']).read_text())
            self.assertIn(names['simulation.js'], (output / names['batch-worker.js']).read_text())
            self.assertEqual(names, build(Path(__file__).parent / 'web', output))
