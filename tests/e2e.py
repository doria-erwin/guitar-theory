"""Browser tests: python3 tests/e2e.py  (needs Playwright + Chromium; WebKit/Firefox used when installed)."""
import sys, os, json
from playwright.sync_api import sync_playwright
URL = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist", "index.html"))
VIEWS = ['fretboard','scales','intervals','builder','finder','shapes','inversions','arpeggios','keys','progressions','rhythm','techniques','harmony','practice','basics']
fails = []
def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond: fails.append(msg)

def run(browser_type, name, viewport, mobile, shots):
    b = browser_type.launch()
    ctx = b.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_timeout(300)
    print(f"[{name} {viewport['width']}x{viewport['height']}]")
    check(pg.locator('#boot').count() == 0, "boot fallback removed once JS runs")
    check(pg.locator('#nav .tab').count() == 15, "15 navigation tabs render")
    check(pg.eval_on_selector('[data-set=root]', 'e => e.value') != '', "root selector has a value")
    for v in VIEWS:
        pg.click(f'#nav [data-view={v}]'); pg.wait_for_timeout(120)
        txt = pg.inner_text('#view')
        check(len(txt) > 80 and 'undefined' not in txt and 'NaN' not in txt and 'failed to draw' not in txt, f"{v}: renders without undefined/NaN")
        # nothing in the page body may overflow horizontally (scroll containers are fine)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(ov <= 1, f"{v}: no page-wide horizontal scroll ({ov}px)")
        if shots: pg.screenshot(path=f"shots/{name}-{viewport['width']}-{v}.png", full_page=False)
    # SVG coordinates are all finite
    pg.click('#nav [data-view=scales]'); pg.wait_for_timeout(100)
    bad = pg.evaluate("""[...document.querySelectorAll('svg circle, svg line, svg rect, svg text')].filter(e => ['cx','cy','x','y','x1','x2','y1','y2'].some(a => e.hasAttribute(a) && !isFinite(parseFloat(e.getAttribute(a))))).length""")
    check(bad == 0, "no NaN/invalid SVG coordinates on the scales view")
    # state sync: change root, switch views, come back
    pg.select_option('[data-set=root]', 'E♭'); pg.wait_for_timeout(80)
    pg.click('#nav [data-view=builder]'); pg.select_option('[data-set=chord]', 'm7'); pg.wait_for_timeout(80)
    check('E♭m7 = E♭ – G♭ – B♭ – D♭' in pg.inner_text('.result'), "builder spells E♭m7 correctly")
    pg.click('#nav [data-view=keys]'); pg.wait_for_timeout(80)
    check(pg.eval_on_selector('[data-set=root]', 'e => e.value') == 'E♭', "root persists across views")
    check('3 flats' in pg.inner_text('#view'), "E♭ key shows 3 flats")
    # tuning change updates labels on the fretboard
    pg.click('#nav [data-view=fretboard]'); pg.select_option('[data-set=fbHighlight]', 'all'); pg.select_option('[data-set=tuning]', 'dropd'); pg.wait_for_timeout(80)
    opens = pg.eval_on_selector_all('.fb-open', 'es => es.map(e => e.textContent)')
    check(opens[:6] == ['D','A','D','G','B','E'], f"drop D string labels {opens[:6]}")
    pg.select_option('[data-set=labels]', 'note'); pg.wait_for_timeout(80)
    low = pg.evaluate("""[...document.querySelectorAll('.fb-dot')].filter(g=>g.dataset.s==='0').map(g=>[+g.dataset.f, g.querySelector('text').textContent])""")
    m = dict(low)
    check(m.get(0) == 'D' and m.get(2) == 'E' and m.get(7) == 'A', f"drop D low string notes recalculated: {[(k,m.get(k)) for k in (0,2,7)]}")
    pg.select_option('[data-set=tuning]', 'std'); pg.select_option('[data-set=labels]', 'degree')
    # custom tuning
    pg.select_option('[data-set=tuning]', 'custom'); pg.wait_for_timeout(80)
    pg.select_option('[data-custom="4"]', 'A'); pg.wait_for_timeout(80)
    check(pg.inner_text('.tun-readout').strip() == 'E A D G A E', "custom tuning applies")
    pg.select_option('[data-set=tuning]', 'std')
    # scale positions
    pg.click('#nav [data-view=scales]'); pg.select_option('[data-set=root]', 'A'); pg.select_option('[data-set=scale]', 'minblues'); pg.wait_for_timeout(80)
    chips = pg.locator('[data-act=pos]').count()
    check(chips == 6, f"minor blues offers whole neck + 5 boxes ({chips})")
    pg.click('[data-act=pos][data-id=box0]'); pg.wait_for_timeout(80)
    blues = pg.locator('.fb-dot.blue').count()
    check(blues == 2, f"box 1 shows two blue notes ({blues})")
    pg.select_option('[data-set=scale]', 'major'); pg.wait_for_timeout(80)
    check(pg.locator('[data-act=pos]').count() == 13, "major offers whole neck + 7 3NPS + 5 CAGED")
    # audio start/stop
    pg.click('#nav [data-view=rhythm]'); pg.wait_for_timeout(60)
    pg.click('[data-act=metro]'); pg.wait_for_timeout(700)
    lit = pg.locator('.pulse.is-now').count()
    running = pg.evaluate("Audio.isRunning()")
    check(running and lit == 1, f"metronome runs and lights one beat (running={running}, lit={lit})")
    pg.click('#nav [data-view=keys]'); pg.wait_for_timeout(200)
    check(not pg.evaluate("Audio.isRunning()") and pg.evaluate("Audio._timers.size") == 0, "switching view stops metronome and clears timers")
    pg.click('#nav [data-view=progressions]'); pg.click('[data-act=progplay]'); pg.wait_for_timeout(900)
    check(pg.locator('.chordtile.is-now').count() == 1, "progression highlights the current chord")
    pg.click('[data-act=progplay]'); pg.wait_for_timeout(100)
    check(not pg.evaluate("Audio.isRunning()") and pg.evaluate("Audio._live.size") == 0, "progression stop cancels all audio")
    # practice: answers not shown before responding
    pg.click('#nav [data-view=practice]'); pg.select_option('[data-ch=pex]', 'interval'); pg.wait_for_timeout(80)
    check(pg.locator('.feedback').count() == 0 and pg.locator('.choice.is-right').count() == 0, "practice hides the answer before submission")
    pg.locator('.choice').first.click(); pg.wait_for_timeout(80)
    check(pg.locator('.feedback').count() == 1 and pg.locator('.choice.is-right').count() == 1, "practice gives feedback after answering")
    sc = pg.inner_text('.score')
    check('1/1' in sc or '0/1' in sc, f"score tracked: {sc[:40]}")
    pg.reload(); pg.wait_for_timeout(200)
    check(pg.eval_on_selector('[data-set=root]', 'e => e.value') == 'A' and pg.locator('#nav .tab.is-on').inner_text() == 'Practice', "settings persist after reload")
    # circle of fifths tap updates key; interval calculator spells enharmonics
    pg.click('#nav [data-view=keys]'); pg.click('.cof-seg[data-i="10"]'); pg.wait_for_timeout(80)
    check(pg.eval_on_selector('[data-set=root]', 'e => e.value') == 'B♭' and 'Gm' in pg.inner_text('#view') and '2 flats' in pg.inner_text('#view'), "tapping B♭ on the circle selects B♭ major (2 flats, Gm relative)")
    pg.click('#nav [data-view=intervals]'); pg.select_option('[data-k=intA][data-part=l]', 'C'); pg.select_option('[data-k=intA][data-part=a]', '0')
    pg.select_option('[data-k=intB][data-part=l]', 'D'); pg.select_option('[data-k=intB][data-part=a]', '1'); pg.wait_for_timeout(80)
    check('Augmented 2nd' in pg.inner_text('#view'), "calculator: C to D♯ is an augmented 2nd")
    pg.select_option('[data-k=intB][data-part=l]', 'E'); pg.select_option('[data-k=intB][data-part=a]', '-1'); pg.wait_for_timeout(80)
    check('Minor 3rd' in pg.inner_text('#view'), "calculator: C to E♭ is a minor 3rd")
    pg.select_option('[data-set=root]', 'A')
    # reverse finder
    pg.click('#nav [data-view=finder]'); pg.click('[data-act=finderpreset] >> nth=1'); pg.wait_for_timeout(80)
    t = pg.inner_text('#view'); check('C6' in t and 'Am7' in t, "finder lists both C6 and Am7 for C E G A")
    check(len(errs) == 0, f"no console errors ({errs[:3]})")
    b.close()

with sync_playwright() as p:
    os.makedirs("shots", exist_ok=True)
    run(p.chromium, "chromium", {"width": 1280, "height": 900}, False, "--shots" in sys.argv)
    run(p.chromium, "iphone", {"width": 390, "height": 844}, True, "--shots" in sys.argv)
    run(p.chromium, "iphone-land", {"width": 844, "height": 390}, True, False)
    for bt, nm in ((p.webkit, "webkit"), (p.firefox, "firefox")):
        try: run(bt, nm, {"width": 390, "height": 844}, nm == "webkit", False)
        except Exception as e: print(f"[{nm}] skipped: {str(e).splitlines()[0][:90]}")
print("\nFAILURES:", len(fails)); [print(" -", f) for f in fails]
sys.exit(1 if fails else 0)
