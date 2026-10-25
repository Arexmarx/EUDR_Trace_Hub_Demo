"""10+ real Chromium UI scenarios, rendered from bundled local HTML/CSS/JS.
The execution sandbox may prohibit localhost navigation; this harness loads source
into about:blank and bridges SHA-256 to Python hashlib only in this TEST browser.
The distributed app itself uses native browser WebCrypto on localhost or HTTPS.

Usage: python tests/test_demo.py
Requirements: playwright (Python), Chromium; PyMuPDF for optional PDF text check.
"""
import hashlib
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
SHOTS = BASE / 'screenshots'
SHOTS.mkdir(exist_ok=True)
RESULTS=[]


def load_app(page):
    html = (BASE/'index.html').read_text(encoding='utf-8')
    # Offline Chromium test: remove remote Google Fonts tags to prevent CDN timeout.
    # The real web app keeps Roboto; visual fallback in isolated test is Arial.
    html = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com[^"<>]*"[^>]*>', '', html)
    html = html.replace('<link rel="stylesheet" href="css/style.css">','')
    html = re.sub(r'<script src="js/[^\"]+"></script>', '', html)
    page.set_content(html)
    # about:blank has an opaque origin in sandbox. Bridge storage and SHA-256 for
    # deterministic UI tests; the hash is still the REAL SHA-256 via hashlib.
    page.expose_function('__sha256_testing', lambda values: list(hashlib.sha256(bytes(values)).digest()))
    page.evaluate("""() => {
      const memory={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>memory[k]??null,
        setItem:(k,v)=>{memory[k]=v},
        removeItem:k=>delete memory[k]
      }});
      Object.defineProperty(window.crypto,'subtle',{configurable:true,value:{
        digest:async(_,input)=>Uint8Array.from(await window.__sha256_testing([...new Uint8Array(input)])).buffer
      }});
    }""")
    page.add_style_tag(content=(BASE/'css/style.css').read_text(encoding='utf-8'))
    for name in ['js/vendor/qrcode-bundle.js','js/data.js','js/pdf.js','js/app.js']:
        page.add_script_tag(content=(BASE/name).read_text(encoding='utf-8'))
    page.locator('h1').first.wait_for()


def assert_case(code, fn):
    try:
        result=fn()
        print(f'PASS {code}: {result}')
        RESULTS.append((code,True,str(result)))
    except Exception as exc:
        print(f'FAIL {code}: {exc}')
        RESULTS.append((code,False,str(exc)))
        raise


def role(page,newrole):
    page.locator('#role-select').select_option(newrole)


def open_lot(page,id):
    if page.locator('[data-view="shipments"]').count():
        page.locator('[data-view="shipments"]').click()
    page.locator(f'[data-action="open-shipment"][data-id="{id}"]').first.click()


def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':940},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        load_app(page)
        page.screenshot(path=str(SHOTS/'01_dashboard.png'),full_page=True)

        def tc01():
            assert page.locator('.stat-number').all_inner_texts()==['04','01','01','02']
            open_lot(page,'LOT-2026-EU-014')
            assert page.locator('.rule-item.failed').count()==0
            assert '19.200 kg' in page.locator('.detail-hero').inner_text()
            assert page.locator('.id-pill').count()>=4
            return 'Lô 014: 19.200 kg, 4 vườn, đạt 7/7'
        assert_case('TC01',tc01)

        def tc02():
            page.locator('[data-view="portal"]').click()
            page.locator('#lookup-form input[name="lot"]').fill('LOT-2026-EU-999')
            page.locator('#lookup-form button').click()
            assert 'chưa được công bố hoặc không tồn tại' in page.locator('#content').inner_text()
            return 'Mã lô không tồn tại báo trạng thái phù hợp'
        assert_case('TC02',tc02)

        def tc03():
            role(page,'ops');open_lot(page,'LOT-2026-EU-015')
            assert page.locator('.rule-item.failed').count()==0
            page.locator('[data-action="create-draft"]').click()
            assert 'Chờ phê duyệt' in page.locator('.detail-hero').inner_text()
            role(page,'legal');open_lot(page,'LOT-2026-EU-015')
            page.locator('[data-action="approve"]').click()
            assert 'Đã phê duyệt' in page.locator('.detail-hero').inner_text()
            page.screenshot(path=str(SHOTS/'05_approval.png'),full_page=True)
            role(page,'ops');open_lot(page,'LOT-2026-EU-015')
            page.locator('[data-action="publish"]').click()
            assert 'Đã công bố' in page.locator('.detail-hero').inner_text()
            st=page.evaluate('TraceHubDemo.getState()')
            lot=next(x for x in st['shipments'] if x['id'].endswith('015'))
            assert len(lot['hash'])==64
            payload=json.dumps(lot['publishedSnapshot'],ensure_ascii=False,separators=(',',':'))
            # JS JSON.stringify key ordering preserved by Python dict
            assert hashlib.sha256(payload.encode()).hexdigest()==lot['hash']
            return 'Lô 015: tạo nháp → pháp chế duyệt → công bố v1, SHA-256 hợp lệ'
        assert_case('TC03',tc03)

        def tc04():
            role(page,'ops');open_lot(page,'LOT-2026-EU-017')
            failed=[x.inner_text() for x in page.locator('.rule-item.failed').all()]
            assert len(failed)==1 and 'R5' in failed[0]
            assert 'cần rà soát thủ công' in failed[0]
            assert 'Cần xử lý' in page.locator('.detail-hero').inner_text()
            return 'Lô 017 bị chặn R5, không tự kết luận phá rừng'
        assert_case('TC04',tc04)

        def tc05():
            open_lot(page,'LOT-2026-EU-016')
            failed=[x.inner_text() for x in page.locator('.rule-item.failed').all()]
            assert len(failed)==3
            assert all(f'R{x}' in '\n'.join(failed) for x in [3,4,6])
            state=page.evaluate('TraceHubDemo.getState()')
            weight=sum(r['weightKg'] for r in state['receipts'] if r['shipmentId'].endswith('016'))
            assert 19200-weight==550
            assert '18.650 kg' in '\n'.join(failed) and '19.200 kg' in '\n'.join(failed)
            assert page.locator('[data-action="create-draft"]').count()==0
            page.screenshot(path=str(SHOTS/'02_blocked.png'),full_page=True)
            return 'Lô 016 chặn R3/R4/R6: thiếu polygon, giấy tờ và lệch 550 kg'
        assert_case('TC05',tc05)

        def tc06():
            role(page,'buyer')
            page.locator('#lookup-form input[name="lot"]').fill('LOT-2026-EU-015')
            page.locator('#lookup-form button').click()
            assert page.locator('.qr-box svg').count()==1
            with page.expect_download() as d: page.locator('[data-action="download-geo"]').click()
            path=SHOTS/'test_export_015.geojson';d.value.save_as(path)
            geo=json.loads(path.read_text(encoding='utf-8'))
            assert geo['type']=='FeatureCollection'
            assert len(geo['features'])==7
            assert all(x['geometry']['type']=='Polygon' for x in geo['features'])
            assert all(r[0]==r[-1] for x in geo['features'] for r in x['geometry']['coordinates'])
            page.evaluate('window.scrollTo(0,0)')
            page.wait_for_timeout(120)
            page.screenshot(path=str(SHOTS/'06_published_portal.png'),full_page=True)
            return 'GeoJSON được tải: 7 polygon khép kín, mã lô 015'
        assert_case('TC06',tc06)

        def tc07():
            with page.expect_download() as d: page.locator('[data-action="download-pdf"]').click()
            path=SHOTS/'test_export_015.pdf';d.value.save_as(path)
            data=path.read_bytes()
            assert data.startswith(b'%PDF-1.4') and len(data)>1000
            try:
                import fitz
                doc=fitz.open(path)
                txt=doc[0].get_text()
                assert 'LOT-2026-EU-015' in txt and 'SOURCE PLOTS' in txt and 'R7' in txt
                assert doc.page_count==1
            except ImportError: pass
            return 'PDF 1.4 tải được, có mã lô và 7 quy tắc'
        assert_case('TC07',tc07)

        def tc08():
            assert page.locator('.qr-box svg path').count()==1
            page.evaluate("location.hash='#/portal/LOT-2026-EU-015'")
            page.wait_for_timeout(100)
            assert 'LOT-2026-EU-015' in page.locator('#content').inner_text()
            return 'QR được vẽ và liên kết hash mở lô 015'
        assert_case('TC08',tc08)

        def tc09():
            page.locator('#lookup-form input[name="lot"]').fill('LOT-2026-EU-014')
            page.locator('#lookup-form button').click()
            page.locator('#ticket-form [name="subject"]').fill('Kiểm tra tọa độ GeoJSON')
            page.locator('#ticket-form [name="contact"]').fill('qa@example.com')
            page.locator('#ticket-form [name="body"]').fill('Xin cung cấp xác nhận hình học polygon, hệ tọa độ WGS84.')
            page.locator('#ticket-form [type="submit"]').click()
            assert 'TK-0002' in page.locator('#content').inner_text()
            role(page,'ops')
            page.locator('[data-view="tickets"]').click()
            assert 'TK-0002' in page.locator('#content').inner_text()
            page.locator('form[data-ticket="TK-0002"] [name="reply"]').fill('Đã cung cấp diễn giải WGS84 của dữ liệu mẫu.')
            page.locator('form[data-ticket="TK-0002"] button').click()
            assert 'Đã phản hồi' in page.locator('#content').inner_text()
            role(page,'buyer');assert 'TK-0002' in page.locator('#content').inner_text()
            return 'TK-0002 tạo và phản hồi, trạng thái hiển thị cho khách'
        assert_case('TC09',tc09)

        def tc10():
            mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            load_app(mobile)
            mobile.locator('[data-view="farmer"]').click()
            assert 'DL-BH-0014' in mobile.locator('#content').inner_text()
            assert 'quyền sử dụng đất' in mobile.locator('#content').inner_text()
            assert 'farmerInternal' not in mobile.locator('#content').inner_text()
            overflow=mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            assert not overflow,f'Horizontal overflow on mobile viewport'
            mobile.screenshot(path=str(SHOTS/'04_farmer_mobile.png'),full_page=True)
            mobile.close()
            return 'Điện thoại 390 px, không tràn ngang, không lộ dữ liệu riêng'
        assert_case('TC10',tc10)

        def tc11():
            role(page,'ops');open_lot(page,'LOT-2026-EU-016')
            page.locator('[data-action="fix-polygon"]').click()
            page.locator('[data-action="fix-legal"]').click()
            page.locator('[data-action="fix-weight"]').click()
            assert page.locator('.rule-item.failed').count()==0
            assert page.locator('[data-action="create-draft"]').count()==1
            return 'Khắc phục 3 ngoại lệ dữ liệu mẫu đưa lô 016 về 7/7'
        assert_case('TC11',tc11)

        def tc12():
            role(page,'ops');open_lot(page,'LOT-2026-EU-017')
            assert page.locator('[data-action="fix-risk"]').count()==0
            role(page,'legal');open_lot(page,'LOT-2026-EU-017')
            assert page.locator('[data-action="fix-risk"]').count()==2
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('[data-action="fix-risk"]').first.click()
            assert page.locator('.rule-item.failed').count()==1
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('[data-action="fix-risk"]').first.click()
            assert page.locator('.rule-item.failed').count()==0
            return 'Cảnh báo 017 chỉ được đóng bằng vai trò Pháp chế, sau thao tác xác nhận'
        assert_case('TC12',tc12)

        assert_case('TC13',lambda: f'Không có lỗi runtime JavaScript: {len(errors)} lỗi' if not errors else (_ for _ in ()).throw(AssertionError(errors)))
        browser.close()
    report={'total':len(RESULTS),'passed':sum(ok for _,ok,_ in RESULTS),'results':[{'id':code,'passed':ok,'description':detail} for code,ok,detail in RESULTS]}
    (BASE/'tests'/'test_results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'\nTOTAL {report["passed"]}/{report["total"]} PASSED')
    if report['passed']!=report['total']:raise SystemExit(1)

if __name__=='__main__':run()
