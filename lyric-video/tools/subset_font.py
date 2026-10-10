"""Subset LXGW WenKai TC to the glyphs the video uses: python3 tools/subset_font.py LXGWWenKaiTC-Regular.ttf"""
import re, sys, pathlib
from fontTools import subset
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'lyrics.js').read_text()
text = ''.join(re.findall(r"\[\s*[\d.]+,\s*[\d.]+,\s*'([^']*)'", src))  # lyric lines
text += ''.join(re.findall(r"(?:title|subtitle): '([^']*)'", src))
chars = ''.join(sorted(set(text + ''.join(map(chr, range(32, 127))) + '·—　')))
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
font = subset.load_font(sys.argv[1], opts)
s = subset.Subsetter(opts); s.populate(text=chars); s.subset(font)
subset.save_font(font, str(root / 'fonts/wenkai-tc-subset.woff2'), opts)
print(len(chars), 'glyphs')
