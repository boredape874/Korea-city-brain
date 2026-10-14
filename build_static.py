"""Fingerprint every related asset so Pages never mixes cached script versions."""
import hashlib
import shutil
from pathlib import Path

def build(source=Path('web'), output=Path('dist')):
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(source, output)
    names = {}
    def asset(name, replacements=None):
        content = (source / name).read_text(encoding='utf-8')
        for before, after in (replacements or {}).items():
            content = content.replace(before, after)
        digest = hashlib.sha256(content.encode()).hexdigest()[:12]
        path = Path(name)
        target = f'{path.stem}.{digest}{path.suffix}'
        (output / target).write_text(content, encoding='utf-8')
        (output / name).unlink()
        names[name] = target
        return target
    simulation = asset('simulation.js')
    worker = asset('batch-worker.js', {'simulation.js': simulation})
    asset('app.js', {'batch-worker.js': worker})
    asset('style.css')
    html = (source / 'index.html').read_text(encoding='utf-8')
    for before, after in names.items():
        html = html.replace(f'"{before}"', f'"{after}"')
    (output / 'index.html').write_text(html, encoding='utf-8')
    (output / '.nojekyll').touch()
    return names

if __name__ == '__main__':
    build()
    print('Static assets fingerprinted and packaged in dist')
