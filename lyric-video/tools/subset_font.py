"""Subset LXGW WenKai to the glyphs the video uses: python3 tools/subset_font.py LXGWWenKai-Regular.ttf"""
import re, sys, pathlib
from fontTools import subset
root = pathlib.Path(__file__).resolve().parent.parent
text = ''.join(re.findall(r"'([^']*)'", (root / 'lyrics.js').read_text()))
text += ''.join(re.findall(r"'([^']*)'", (root / 'scene.js').read_text()))
chars = ''.join(sorted(set(text + ' ·—0123456789')))
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
font = subset.load_font(sys.argv[1], opts)
s = subset.Subsetter(opts); s.populate(text=chars); s.subset(font)
subset.save_font(font, str(root / 'fonts/wenkai-subset.woff2'), opts)
print(len(chars), 'glyphs')
