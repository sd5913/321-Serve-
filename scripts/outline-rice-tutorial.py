"""Bake the bundled IBM Plex Mono glyphs into tutorial SVGs (development only).

Requires fonttools; no font download or browser dependency is introduced.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent.parent
FONT = TTFont(ROOT / 'assets/fonts/IBMPlexMono-Regular.ttf')
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
UNITS = FONT['head'].unitsPerEm
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
for file in (ROOT / 'assets/ui/elements/tutorial/rice-rice-baby').glob('*.svg'):
    tree = ET.parse(file)
    changed = False
    for parent in tree.getroot().iter():
        for index, node in enumerate(list(parent)):
            if node.tag != '{' + NS + '}text':
                continue
            value = ''.join(node.itertext())
            scale = float(node.get('font-size', '29')) / UNITS
            width = sum(FONT['hmtx'][CMAP.get(ord(c), '.notdef')][0] for c in value)
            x, y = float(node.get('x', '0')), float(node.get('y', '0'))
            if node.get('text-anchor') == 'middle':
                x -= width * scale / 2
            group = ET.Element('{' + NS + '}g', {
                'transform': f'translate({x:g} {y:g}) scale({scale:g} {-scale:g})',
                'fill': node.get('fill', '#00133A'), 'aria-label': value})
            advance = 0
            for char in value:
                name = CMAP.get(ord(char), '.notdef')
                pen = SVGPathPen(GLYPHS)
                GLYPHS[name].draw(pen)
                commands = pen.getCommands()
                if commands:
                    ET.SubElement(group, '{' + NS + '}path', {
                        'transform': f'translate({advance} 0)', 'd': commands})
                advance += FONT['hmtx'][name][0]
            parent.remove(node)
            parent.insert(index, group)
            changed = True
    if changed:
        tree.write(file, encoding='unicode')
print('Outlined tutorial body text with the bundled IBM Plex Mono font.')
