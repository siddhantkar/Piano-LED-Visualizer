import numpy as np
import os
import glob

colormaps = {}
colormaps_preview = {}

# Colormap gradients designed with ws281x gamma = 1
# These will be converted to colormap lookup tables with 256 entries for use in colormaps dict
gradients = {}

# Hard-coded gradients:

# Rainbow, as existing in lib/functions.py, equiv to FastLED-HSV Spectrum
gradients["Rainbow"] = [ (255,0,0), (0,255,0), (0,0,255), (255,0,0) ]

# FastLED Rainbow - https://github.com/FastLED/FastLED/wiki/FastLED-HSV-Colors
gradients["Rainbow-FastLED"] = [ (0.0, (255,0,0)), (0.125, (170,85,0)), (0.25, (170,170,0)), (0.375, (0,255,0)), (0.5, (0,170,85)), (0.625, (0,0,255)), (1.0, (255,0,0)) ]
# Rainbow-FastLED-Y2: Should the 0.375 green have some red?
#gradients["Rainbow-FastLED-Y2"] = [ (0.0, (255,0,0)), (0.125, (170,85,0)), (0.25, (255,255,0)), (0.375, (0,255,0)), (0.5, (0,170,85)), (0.625, (0,0,255)), (1.0, (255,0,0)) ]

gradients["Pastel"] = [ (255,72,72), (72,255,72), (72,72,255), (255,72,72) ]

gradients["Ice-Cyclic"] = [ (0.0, (0,128,128)), (0.25, (0,0,255)), (0.5, (128,0,128)), (0.75, (86,86,86)), (1.0, (0,128,128)) ]
gradients["Cool-Cyclic"] = [ (0.0, (0,128,0)), (0.25, (0,126,128)), (0.5, (0,0,255)), (0.75, (86,86,86)), (1.0, (0,128,0)) ]
gradients["Warm-Cyclic"] = [ (0.0, (255,0,0)), (0.4, (170,64,0)), (0.6, (128,126,0)), (0.8, (86,85,86)), (1.0, (255,0,0)) ]

# Gradients from files:
#
# cmocean and colorcet data from https://nicoguaro.github.io/posts/cyclic_colormaps/
#   cmocean - phase: https://matplotlib.org/cmocean/
#   colorcet - cyclic_mrybm, cyclic_mygbm - https://github.com/holoviz/colorcet
#
# hsluv and hpluv: https://www.hsluv.org/



# Homemade rough equivalent to matplotlib's LinearSegmentedColormap.from_list()
def gradient_to_cmaplut(gradient, gamma=1, entries=256, int_table=True):
    """Linear-interpolate gradient to a colormap lookup."""
    _CYCLIC_UNDUP = False

    # expected gradient format option 1: (position, (red, green, blue))
    if len(gradient[0]) == 2:
        pos, colors = zip(*gradient)
        r, g, b = zip(*colors)
    # expected gradient format option 2: (red, green, blue)
    elif len(gradient[0]) == 3:
        pos = np.linspace(0, 1, num=len(gradient))
        r, g, b = zip(*gradient)
    # expected gradient format option 3: [pos, red, green, blue], for future np.loadtxt from file
    elif len(gradient[0]) == 4:
        pos, r, g, b = zip(*gradient)
    else:
        raise Exception("Unknown input format")

    # if colors are int, then assumed 0-255 range, float 0-1 range
    if isinstance(r[0], float):
        div255 = False
    elif isinstance(r[0], int):
        div255 = True

    # if colormap is cyclic (first color matches last color), then do not include endpoint during calculation 
    # to prevent index 0 and 255 being duplicate color
    if _CYCLIC_UNDUP and (r[0], g[0], b[0]) == (r[-1], g[-1], b[-1]):
        xpoints = np.linspace(0, 1, num=entries, endpoint=False)
    else:
        xpoints = np.linspace(0, 1, num=entries, endpoint=True)

    # output tables
    table = np.zeros((3,entries), dtype=float)

    for i, c in enumerate((r,g,b)):
        c01 = np.divide(c, 255) if div255 else c
        table[i] = np.interp(xpoints, pos, c01) ** (1/gamma)

    if int_table:
        return [ (round(x[0] * 255), round(x[1] * 255), round(x[2] * 255)) for x in table.T ]
    else:
        return [ (x[0], x[1], x[2]) for x in table.T ]

def generate_colormaps(gradients, gamma):
    global colorsmaps, colorsmaps_preview
    for k, v in gradients.items():
        try:
            colormaps[k] = gradient_to_cmaplut(v, gamma)
            colormaps_preview[k] = gradient_to_cmaplut(v, 2.2, 64)
        except Exception as e:
            print(f"Loading colormap {k} failed: {e}") # if a gradient fails, skip it

def load_colormaps():
    gradients = {}

    files = glob.glob("Colormaps/*.led.data")
    for f in files:
        try:
            name_ext = os.path.splitext(os.path.basename(f))[0]
            name = os.path.splitext(name_ext)[0]
            gradients[name] = np.loadtxt(f).tolist()
        except Exception as e:
            print(f"Loading colormap datafile {f} failed: {e}") # if a gradient fails, skip it
    
    # sRGB files are gamma converted by **2.2 before loading into gradients to keep with ws2812's intensity-based color space
    files = glob.glob("Colormaps/*.sRGB.data")
    for f in files:
        try:
            name_ext = os.path.splitext(os.path.basename(f))[0]
            name = os.path.splitext(name_ext)[0]
            if name in gradients:
                name = name + "~"
            gradients[name] = np.loadtxt(f, converters=lambda x: float(x)**2.2).tolist()
        except Exception as e:
            print(f"Loading colormap datafile {f} failed: {e}") # if a gradient fails, skip it
    
    return dict(sorted(gradients.items()))