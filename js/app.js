/* EUDR TraceHub | Fully client-side academic prototype, no backend and no official API.
   Simplified rules R1–R7 demonstrate information-service workflow, NOT a legal compliance decision.
   All state lives in this browser's localStorage. */
(function(){
  'use strict';
  const KEY='tracehub_academic_v2_final';
  const $=(x)=>document.querySelector(x);
  const clone=(x)=>JSON.parse(JSON.stringify(x));
  const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=(n)=>Number(n).toLocaleString('vi-VN');
  const icon=(id)=>`<svg class="icon" aria-hidden="true"><use href="#ico-${id}"/></svg>`;
  const now=()=>new Date().toISOString();
  const niceDate=(v)=>v?new Date(v).toLocaleDateString('vi-VN'):'—';
  const idTail=(id)=>id.slice(-3);
  const windowBase=()=>location.href.split('#')[0];
  const initial=()=>({plots:clone(DEMO_DATA.plots),receipts:clone(DEMO_DATA.receipts),warehouses:clone(DEMO_DATA.warehouses),shipments:clone(DEMO_DATA.shipments),tickets:[{id:'TK-0001',shipmentId:'LOT-2026-EU-014',subject:'Xác nhận định dạng hình học',body:'Xin xác nhận bộ GeoJSON đã dùng hệ tọa độ WGS84?',contact:'anna@example.invalid',status:'answered',reply:'GeoJSON trong bản mẫu dùng hệ tọa độ WGS84 (EPSG:4326).',createdAt:'2026-10-18T13:20:00'}],events:[]});
  let state;try{let saved=JSON.parse(localStorage.getItem(KEY)||'null');state=saved&&saved.shipments?.length===4&&saved.plots?.length===20?saved:initial();}catch(e){state=initial();}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){notify('Không thể lưu trạng thái trên trình duyệt này.');}};
  let view='overview',role='ops',selectedId='LOT-2026-EU-015',portalId='LOT-2026-EU-014',farmId='DL-BH-0014',portalLang='vi',search='',filter='all',toastTimer=null;
  const getShip=(id)=>state.shipments.find(s=>s.id===id);
  const receipts=(id)=>state.receipts.filter(r=>r.shipmentId===id);
  const warehouses=(id)=>state.warehouses.filter(w=>w.shipmentId===id);
  const plots=(id)=>receipts(id).map(r=>state.plots.find(p=>p.id===r.plotId)).filter(Boolean);
  const log=(action,subject)=>state.events.unshift({action,subject,time:now(),role});
  const notify=(msg)=>{const toast=$('#toast');if(!toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3400);};
  function geometryOk(plot){const geom=plot.geometry;if(!geom)return false;if(plot.area>4&&geom.type!=='Polygon'&&geom.type!=='MultiPolygon')return false;return geom.type==='Polygon'?Array.isArray(geom.coordinates?.[0])&&geom.coordinates[0].length>=4&&JSON.stringify(geom.coordinates[0][0])===JSON.stringify(geom.coordinates[0].at(-1)):geom.type==='Point'&&geom.coordinates?.length===2;}
  function runChecks(s){
    const rec=receipts(s.id),source=plots(s.id),wh=warehouses(s.id),recSum=rec.reduce((a,r)=>a+r.weightKg,0),whSum=wh.reduce((a,w)=>a+w.weightKg,0);
    const invalidGeo=source.filter(p=>!geometryOk(p));const illegal=source.filter(p=>!p.legal||!p.consent);
    const risks=source.filter(p=>p.warning||!p.verified||!p.forestChecked);
    const high=rec.filter(r=>{const p=state.plots.find(x=>x.id===r.plotId);return p&&r.weightKg>p.capacity;});
    const labels=[
      ['Thông tin bắt buộc của lô','Shipment core metadata',!!(s.id&&s.hs&&s.productionCountry&&s.productionTime&&s.buyer&&s.weightKg>0&&s.sailingDate),'Mã lô, HS 0901.11, nơi sản xuất, sản lượng, bên nhận và ngày tàu'],
      ['Liên kết nguồn cung','Source chain linkage',!!(rec.length&&source.length===rec.length&&wh.length&&rec.every(r=>state.plots.some(p=>p.id===r.plotId))),'Phiếu thu mua → mã vườn → lô kho → lô xuất phải có liên kết'],
      ['Dữ liệu định vị (EUDR)','Plot geolocation',invalidGeo.length===0,invalidGeo.length?`${invalidGeo.map(p=>p.id).join(', ')}: vườn > 4 ha phải có polygon khép kín`:'Đủ hình học mô phỏng theo quy tắc diện tích 4 ha'],
      ['Bằng chứng hợp pháp','Legal evidence',illegal.length===0,illegal.length?`${illegal.map(p=>p.id).join(', ')}: thiếu hồ sơ đất hoặc đồng ý chia sẻ`:'Đã đánh dấu kiểm tra giấy tờ đất và sự đồng ý trên dữ liệu mẫu'],
      ['Xác minh và cảnh báo rủi ro','Risk verification',risks.length===0,risks.length?`${risks.map(p=>p.id).join(', ')}: cảnh báo hoặc chưa xác minh, cần rà soát thủ công`:'Không có cảnh báo đang mở trong dữ liệu giả lập'],
      ['Cân đối khối lượng','Weight reconciliation',recSum===whSum&&whSum===s.weightKg,`Phiếu: ${fmt(recSum)} kg · Kho: ${fmt(whSum)} kg · Lô xuất: ${fmt(s.weightKg)} kg`],
      ['Sản lượng / năng lực vườn','Farm production capacity',high.length===0,high.length?`${high.map(r=>r.plotId).join(', ')}: vượt năng lực ước tính`:'Tất cả phiếu trong năng lực ước tính của từng vườn (giả định)']
    ];
    return labels.map(([title,shortEn,ok,detail],i)=>({id:i+1,title,shortEn,ok,detail}));
  }
  const passed=(id)=>runChecks(getShip(id)).filter(r=>r.ok).length;
  const status=(s)=>['published','approved','draft'].includes(s.status)?s.status:(passed(s.id)===7?'ready':'blocked');
  const badge=(s)=>({published:['Đã công bố','good'],approved:['Đã phê duyệt','blue'],draft:['Chờ phê duyệt','warn'],ready:['Sẵn sàng hồ sơ','good'],blocked:['Cần xử lý','bad']})[status(s)];
  const tag=(s)=>{const [label,type]=badge(s);return `<span class="badge ${type}">${label}</span>`;};
  const metrics=()=>({published:state.shipments.filter(s=>status(s)==='published').length,ready:state.shipments.filter(s=>status(s)==='ready').length,blocked:state.shipments.filter(s=>status(s)==='blocked').length,openTickets:state.tickets.filter(t=>t.status!=='answered').length});
  function geoCollection(id){return {type:'FeatureCollection',name:id,crs:{type:'name',properties:{name:'urn:ogc:def:crs:OGC:1.3:CRS84'}},features:plots(id).filter(p=>geometryOk(p)).map(p=>({type:'Feature',properties:{plot_id:p.id,area_ha:p.area,district:p.district,province:p.province,review_status:p.warning?'requires_manual_review':'sample_verified'},geometry:clone(p.geometry)}))};}
  function packageSnapshot(s){return {schema:'EUDR-TraceHub-demo/2',notice:'ACADEMIC SYNTHETIC DATA; NOT DDS OR LEGAL CERTIFICATION',shipment:{id:s.id,hs:s.hs,weightKg:s.weightKg,productionCountry:s.productionCountry,productionTime:s.productionTime,buyer:s.buyer,version:s.pendingVersion||s.version},receipts:clone(receipts(s.id)),warehouses:clone(warehouses(s.id)),plots:clone(plots(s.id).map(({farmerInternal,...x})=>x)),checks:runChecks(s).map(({id,ok})=>({id,ok}))};}
  async function digest(x){if(!crypto?.subtle)throw new Error('SHA-256 yêu cầu localhost hoặc HTTPS');const raw=typeof x==='string'?x:JSON.stringify(x);const out=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return [...new Uint8Array(out)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  async function seedHash(){const s=getShip('LOT-2026-EU-014');if(!s.hash){s.publishedSnapshot=packageSnapshot(s);s.hash=await digest(s.publishedSnapshot);s.versions=[{version:1,hash:s.hash,date:'2026-10-18T15:10:00',snapshot:s.publishedSnapshot}];save();}}
  const card=(content,more='')=>`<section class="card ${more}">${content}</section>`;
  const section=(title,description='',right='')=>`<div class="section-head"><div><h2>${title}</h2>${description?`<p>${description}</p>`:''}</div>${right}</div>`;
  const intro=(eyebrow,title,description,actions='')=>`<div class="page-intro"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`;
  const button=(label,action,style='btn',iconName='',more='')=>`<button type="button" class="${style}" data-action="${action}" ${more}>${iconName?icon(iconName):''}${label}</button>`;
  function shipmentTable(shipments=state.shipments){return `<div class="horizontal-scroll"><table class="data-table"><thead><tr><th>Mã lô xuất</th><th>Nhà nhập khẩu</th><th>Khối lượng</th><th>Ngày tàu</th><th>Kiểm tra</th><th>Trạng thái</th><th></th></tr></thead><tbody>${shipments.map(s=>`<tr><td><button class="table-link" data-action="open-shipment" data-id="${s.id}">${s.id}</button><div class="secondary-txt">${esc(s.destination)}</div></td><td>${esc(s.buyer)}</td><td class="num">${fmt(s.weightKg)} kg</td><td>${niceDate(s.sailingDate)}</td><td><strong>${passed(s.id)}/7</strong><div class="secondary-txt">quy tắc dữ liệu</div></td><td>${tag(s)}</td><td><button class="btn mini" data-action="open-shipment" data-id="${s.id}">${icon('arrow')}</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">Không tìm thấy lô phù hợp.</td></tr>'}</tbody></table></div>`;}
  function overview(){const m=metrics();const total=state.shipments.length;return `
    ${intro('WORKSPACE / 01','Quản trị dữ liệu nguồn cung','Theo dõi mức sẵn sàng hồ sơ hỗ trợ thẩm định EUDR theo từng lô hàng xuất khẩu.',button('Xem lô xuất khẩu','view-shipments','btn primary','arrow'))}
    <div class="stat-grid">
      ${stat('Lô xuất khẩu',`0${total}`,'Trong tập dữ liệu mô phỏng','package')}
      ${stat('Đã công bố',`0${m.published}`,'Có hồ sơ và mã truy cập','shield',true)}
      ${stat('Sẵn sàng',`0${m.ready}`,'Đạt đủ 7 quy tắc dữ liệu','check')}
      ${stat('Cần xử lý',`0${m.blocked}`,'Thiếu dữ liệu hoặc cảnh báo mở','alert')}
    </div>
    <div class="split-layout"><div>
      ${card(`<div class="card-pad">${section('Tình trạng hồ sơ theo lô','Danh sách cập nhật dựa trên bộ quy tắc R1–R7.',button('Xem tất cả','view-shipments','btn mini'))}${shipmentTable()}</div>`)}
      ${card(`<div class="card-pad">${section('Chuỗi truy xuất thông tin','Tích hợp dữ liệu có sẵn từ hệ thống nguồn cung S1.')}<div class="trace-flow">${[['20 vườn','Dữ liệu định vị'],['19 phiếu','Thu mua có mã vườn'],['5 lô kho','Kiểm tra cân đối'],['4 lô xuất','Hồ sơ Shipment Pack']].map((x,i)=>`${i?`<div class="trace-arrow">${icon('arrow')}</div>`:''}<div class="trace-node"><strong>${x[0]}</strong><small>${x[1]}</small></div>`).join('')}</div><p class="footnote">Các số liệu trên được thiết kế cho mục đích thử nghiệm, không phải thông tin sản xuất thực tế của Simexco DakLak.</p></div>`).replace('class="card card-pad"','class="card card-pad"')}
    </div><div>
      ${card(`<div class="card-pad">${section('Chất lượng tập dữ liệu','Minh họa tỷ lệ đạt quy tắc của bốn lô.')}${state.shipments.map(s=>`<div class="progress-row"><span>${idTail(s.id)} · ${esc(s.destination.split(',')[0])}</span><strong>${passed(s.id)}/7</strong></div><div class="progress-track"><div class="fill" style="width:${passed(s.id)/7*100}%"></div></div>`).join('')}<div class="legend"><span><i style="background:#569a73"></i>Quy tắc đạt</span><span><i style="background:#e9efe8"></i>Cần hoàn thiện</span></div></div>`)}
      ${card(`<div class="card-pad">${section('Nhật ký vận hành','Các bước phê duyệt và cập nhật gần nhất.')}${timeline()}</div>`)}
    </div></div>`;}
  function stat(label,val,caption,ic,highlight){return `<section class="card stat-card ${highlight?'highlight':''}"><span class="stat-label">${label}</span><span class="stat-icon">${icon(ic)}</span><div class="stat-number num">${val}</div><div class="stat-caption">${caption}</div></section>`;}
  function timeline(){const items=state.events.slice(0,3);if(!items.length){items.push({action:'Kiểm tra dữ liệu R1–R7',subject:'LOT-2026-EU-015',time:'2026-10-18T09:20:00'},{action:'Khởi tạo cảnh báo định vị',subject:'LOT-2026-EU-017',time:'2026-10-17T13:00:00'},{action:'Cập nhật hồ sơ mẫu',subject:'LOT-2026-EU-014',time:'2026-10-17T09:00:00'});}return `<div class="timeline">${items.map(e=>`<div class="timeline-item"><strong>${esc(e.action)}</strong><p>${esc(e.subject)}</p><small>${niceDate(e.time)}</small></div>`).join('')}</div>`;}
  function shipmentsPage(){const filtered=state.shipments.filter(s=>(!search||[s.id,s.buyer,s.destination].join(' ').toLowerCase().includes(search.toLowerCase()))&&(filter==='all'||status(s)===filter));return `${intro('OPERATIONS / 02','Danh sách lô xuất khẩu','Mỗi lô gắn với phiếu thu mua, mảnh vườn, hồ sơ kiểm tra và lịch sử công bố.')}
      <div class="filter-bar"><label class="search-field">${icon('search')}<input id="shipment-search" type="search" placeholder="Tìm mã lô, đối tác..." value="${esc(search)}" aria-label="Tìm kiếm lô hàng"></label><div class="chips">${[['all','Tất cả'],['published','Đã công bố'],['ready','Sẵn sàng'],['blocked','Cần xử lý']].map(([v,t])=>`<button class="chip ${filter===v?'active':''}" data-action="filter" data-filter="${v}">${t}</button>`).join('')}</div></div>
      ${card(`<div class="card-pad">${section('Tất cả hồ sơ','Bốn tình huống minh họa trong báo cáo đồ án.')}${shipmentTable(filtered)}</div>`)}
      <div class="notice">${icon('lock')} <strong>Phân quyền mô phỏng:</strong> Nhân viên vận hành tạo bản nháp và công bố; vai trò pháp chế phê duyệt. Việc chọn vai trò không phải cơ chế xác thực người dùng thật.</div>`;}
  function workflow(s){const idx=({blocked:0,ready:1,draft:2,approved:3,published:4})[status(s)];return `<div class="workflow-stepper">${[['Rà soát','01'],['Dữ liệu đạt','02'],['Bản nháp','03'],['Phê duyệt','04'],['Công bố','05']].map(([title,number],i)=>`<div class="step ${i<idx?'completed':i===idx?'current':''}"><span>${number}</span><strong>${title}</strong></div>`).join('')}</div>`;}
  function detailActions(s){const st=status(s),items=[button('Danh sách lô','view-shipments','btn','arrow')];
    if(st==='ready'&&role==='ops')items.push(button('Tạo bản nháp','create-draft','btn primary','file'));
    if(st==='draft'&&role==='legal')items.push(button('Phê duyệt hồ sơ','approve','btn primary','check'));
    if(st==='approved'&&role==='ops')items.push(button('Công bố & tạo QR','publish','btn primary','shield'));
    if(st==='published'&&role==='ops')items.push(button('Tạo bản sửa đổi','revise','btn','refresh'));
    if(st==='published')items.push(button('Xem cổng đối tác','open-portal','btn','globe'));
    return items.join('');
  }
  function mapSvg(source){const coords=source.flatMap(p=>p.geometry?.type==='Polygon'?p.geometry.coordinates[0]:p.geometry?.coordinates?[p.geometry.coordinates]:[]);
    const lons=coords.map(c=>c[0]),lats=coords.map(c=>c[1]),a=Math.min(...lons)-.005,b=Math.max(...lons)+.005,c=Math.min(...lats)-.004,d=Math.max(...lats)+.004;
    const project=([lon,lat])=>[35+(lon-a)/(b-a)*645,24+(d-lat)/(d-c)*287];
    const grids=Array.from({length:10},(_,i)=>`<path d="M${i*85} 0V340M0 ${i*46}H720" stroke="#dae6db" stroke-width=".7"/>`).join('');
    const shapes=source.map((p,i)=>{
      const cl=p.warning?'warning':!geometryOk(p)?'failed':'';const path=p.geometry.type==='Polygon'?p.geometry.coordinates[0].map((xy,j)=>`${j?'L':'M'}${project(xy).map(v=>v.toFixed(1)).join(' ')}`).join(' ')+ ' Z':null;
      if(path){let [xx,yy]=project(p.geometry.coordinates[0][0]);return `<path data-action="plot-info" data-id="${p.id}" class="plot-shape ${cl}" d="${path}"><title>${p.id} · ${p.area} ha</title></path><text class="map-label" x="${xx+6}" y="${yy-3}">${i+1}</text>`;}
      const [x,y]=project(p.geometry.coordinates);return `<circle data-action="plot-info" data-id="${p.id}" cx="${x}" cy="${y}" r="7" class="plot-shape ${cl}"><title>${p.id} · thiếu polygon</title></circle><text class="map-label" x="${x+9}" y="${y-7}">${i+1}</text>`;
    }).join('');
    return `<div class="map-surface"><div class="map-overlay">${icon('map')} Mảnh đất · WGS84</div><svg viewBox="0 0 720 340" role="img" aria-label="Bản đồ sơ đồ các mảnh đất của lô hàng"><rect width="720" height="340" fill="#eef4ee"/><g opacity=".55">${grids}</g><path d="M-20 300C150 240 220 285 365 240S600 230 750 110" fill="none" stroke="#dceadd" stroke-width="26"/><path d="M-20 300C150 240 220 285 365 240S600 230 750 110" fill="none" stroke="#f8faf7" stroke-width="6" stroke-dasharray="8 8"/><g>${shapes}</g><text x="666" y="30" font-size="14" fill="#8faa97" font-weight="700">N ↑</text></svg><div class="map-legend">Hình học mô phỏng · Không có bản đồ nền địa chính</div></div>`;
  }
  function rulesHtml(s){const r=runChecks(s);return `<div class="rules" data-testid="rule-list">${r.map(item=>`<div class="rule-item ${item.ok?'':'failed'}"><div class="rule-index">R${item.id}</div><div><div class="rule-title">${item.title}</div><p class="rule-detail">${esc(item.detail)}</p></div><div class="rule-status">${item.ok?'✓ Đạt':'! Chưa đạt'}</div></div>`).join('')}</div>`;}
  function deficiencies(s){const id=s.id;let fixes=[];
    if(id.endsWith('016')){
      const p13=state.plots.find(p=>p.id==='DL-BH-0013'),p14=state.plots.find(p=>p.id==='DL-BH-0014');
      if(!geometryOk(p13))fixes.push(['DL-BH-0013','Vườn 5,2 ha chưa có polygon khép kín','fix-polygon','Bổ sung polygon']);
      if(!p14.legal)fixes.push(['DL-BH-0014','Thiếu xác nhận chứng từ quyền sử dụng đất','fix-legal','Ghi nhận tài liệu mẫu']);
      if(!runChecks(s)[5].ok)fixes.push(['WH-2026-016-A','Phiếu thu mua 18.650 kg, lô kho và lô xuất 19.200 kg','fix-weight','Đối soát chứng từ mẫu']);
    }
    if(id.endsWith('017')){for(const p of plots(id).filter(x=>x.warning))fixes.push([p.id,'Cảnh báo lớp rừng 2020 chưa xác minh thực địa','fix-risk','Xác minh (mô phỏng)']);}
    if(!fixes.length)return `<div class="notice">Không có hành động khắc phục đang mở. Việc đạt quy tắc chỉ phản ánh dữ liệu giả lập.</div>`;
    return `<div class="fix-list">${fixes.map(([code,message,action,label])=>`<div class="fix-item"><div><div class="fix-code">${code}</div><strong>${message}</strong><p>Chỉ cập nhật bộ dữ liệu thử nghiệm; không xác minh thực địa hoặc giấy tờ thật.</p></div>${(role==='ops'&&action!=='fix-risk')||(role==='legal'&&action==='fix-risk')?`<button class="btn mini" data-action="${action}" data-id="${code}">${label}</button>`:'<span class="subtle-note">Không thuộc quyền hiện tại</span>'}</div>`).join('')}</div>`;
  }
  function detail(){const s=getShip(selectedId);if(!s)return shipmentsPage();const r=runChecks(s),rec=receipts(s.id),source=plots(s.id);return `${intro('SHIPMENT / TRACEABILITY','Chi tiết hồ sơ theo lô','Kiểm soát chuỗi dữ liệu và phê duyệt hồ sơ trước khi cung cấp cho nhà nhập khẩu.')}
    <section class="detail-hero"><div class="eyebrow">SHIPMENT ID / SIMULATED</div><div class="row-between" style="justify-content:flex-start;gap:13px;flex-wrap:wrap"><h1>${s.id}</h1>${tag(s)}</div><div class="hero-meta"><div class="meta-item"><small>Nhà nhập khẩu</small><strong>${esc(s.buyer)}</strong></div><div class="meta-item"><small>Khối lượng</small><strong>${fmt(s.weightKg)} kg</strong></div><div class="meta-item"><small>Ngày tàu dự kiến</small><strong>${niceDate(s.sailingDate)}</strong></div><div class="meta-item"><small>Vùng nguyên liệu</small><strong>Đắk Lắk · Việt Nam</strong></div></div></section>
    <div class="detail-actions">${detailActions(s)}</div>
    ${workflow(s)}
    <div class="split-layout"><div>
      ${card(`<div class="card-pad">${section('Kiểm tra điều kiện lập hồ sơ',`${r.filter(x=>x.ok).length}/7 quy tắc thông tin đạt (chỉ đánh giá dữ liệu mẫu).`)}${rulesHtml(s)}</div>`)}
      ${card(`<div class="card-pad">${section('Liên kết nguồn gốc','Từ mảnh đất đến lô hàng xuất khẩu.') }<div class="trace-flow"><div class="trace-node"><strong>${source.length} vườn</strong><small>Mã vườn xác định</small></div><div class="trace-arrow">${icon('arrow')}</div><div class="trace-node"><strong>${rec.length} phiếu thu mua</strong><small>${fmt(rec.reduce((a,b)=>a+b.weightKg,0))} kg</small></div><div class="trace-arrow">${icon('arrow')}</div><div class="trace-node"><strong>${warehouses(s.id).length} lô kho</strong><small>${fmt(warehouses(s.id).reduce((a,b)=>a+b.weightKg,0))} kg</small></div><div class="trace-arrow">${icon('arrow')}</div><div class="trace-node"><strong>1 lô xuất</strong><small>${fmt(s.weightKg)} kg</small></div></div><div class="pills">${source.map(p=>`<span class="id-pill ${p.warning?'warning':''}">${p.id}</span>`).join('')}</div></div>`)}
      ${(!r.every(x=>x.ok))?card(`<div class="card-pad">${section('Các trường cần xử lý','Cập nhật dữ liệu mô phỏng để minh họa quản lý ngoại lệ.')}${deficiencies(s)}</div>`):''}
      ${card(`<div class="card-pad">${section('Lịch sử và phiên bản','Mọi thay đổi được ghi nhận trên trình duyệt này.')}${s.hash?`<div class="notice"><strong>SHA-256 / Hồ sơ v${s.version}</strong><div class="hash">${esc(s.hash)}</div>${button('Kiểm tra toàn vẹn','verify-hash','btn mini','shield')}</div>`:''}<div class="version-list">${(s.history||[]).map(h=>`<div class="version-line"><strong>${esc(h.date)}</strong><span>${esc(h.action)}</span><span class="muted">${esc(h.actor)}</span></div>`).join('')||'<p class="muted small">Chưa có hoạt động phê duyệt và công bố.</p>'}</div></div>`)}
    </div><div>
      ${card(`<div class="card-pad">${section('Vị trí mảnh đất',`${source.length} vườn tham gia lô.`)}${mapSvg(source)}<p class="footnote">Mọi tọa độ trong hình và GeoJSON đều giả lập; phép kiểm tra R5 không dùng ảnh vệ tinh thực.</p></div>`)}
      ${card(`<div class="card-pad">${section('Tóm tắt dữ liệu','Phân quyền chỉ hiển thị mã vườn, không công bố tên chủ hộ.')}<div class="report-grid"><div class="report-metric"><small>Số vườn</small><strong>${source.length}</strong></div><div class="report-metric"><small>Phiếu thu mua</small><strong>${rec.length}</strong></div><div class="report-metric"><small>Quy tắc đạt</small><strong>${passed(s.id)}/7</strong></div><div class="report-metric"><small>Khối lượng xuất</small><strong>${fmt(s.weightKg)} kg</strong></div><div class="report-metric"><small>Diện tích cộng</small><strong>${source.reduce((a,p)=>a+p.area,0).toFixed(1)} ha</strong></div><div class="report-metric"><small>Hệ quy chiếu</small><strong>WGS84</strong></div></div></div>`)}
      ${card(`<div class="card-pad">${section('Vai trò thực thi','Ranh giới công việc trong bản demo.')}<div class="timeline"><div class="timeline-item"><strong>Vận hành</strong><p>Kiểm tra, hoàn thiện dữ liệu, tạo bản nháp và công bố.</p></div><div class="timeline-item"><strong>Pháp chế</strong><p>Thẩm tra hồ sơ mẫu và phê duyệt; xác minh cảnh báo theo quyền.</p></div><div class="timeline-item"><strong>Nhà nhập khẩu EU</strong><p>Chỉ truy cập hồ sơ đã công bố để hỗ trợ operator lập DDS.</p></div></div></div>`)}
    </div></div>`;}
  function qrSvg(value){try{const qr=new window.QRCodeModel(0,window.QRErrorCorrectLevel.M);qr.addData(value);qr.make();const count=qr.getModuleCount(),q=4,sz=count+q*2;let path='';for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))path+=`M${x+q} ${y+q}h1v1h-1Z`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" aria-label="Mã QR mở hồ sơ ${esc(value)}"><rect width="${sz}" height="${sz}" fill="#fff"/><path fill="#1c392c" d="${path}"/></svg>`;
    }catch(e){return '<p class="muted">QR không khả dụng trong trình duyệt này.</p>';}}
  const t=(vi,en)=>portalLang==='vi'?vi:en;
  function portal(){const s=getShip(portalId),pub=s&&status(s)==='published';return `
    <section class="portal-cover"><div class="eyebrow">TRACEABLE COFFEE · EXPORT DATA</div><h1>${t('Minh bạch từ từng mảnh vườn.','Traceable from every coffee plot.')}</h1><p>${t('Tra cứu bộ dữ liệu hỗ trợ thẩm định, được cung cấp theo từng lô cà phê.','Access supporting due diligence information for each coffee shipment.')}</p></section>
    <div class="row-between" style="margin-bottom:14px"><div>${section(t('Cổng tra cứu cho đối tác EU','EU importer information portal'),t('Chỉ hồ sơ đã công bố mới được phép tải.','Only published packages are available to download.'))}</div><div class="lang-pills"><button data-action="lang" data-lang="vi" class="${portalLang==='vi'?'active':''}">VI</button><button data-action="lang" data-lang="en" class="${portalLang==='en'?'active':''}">EN</button></div></div>
    ${card(`<div class="card-pad"><form id="lookup-form" class="search-large">${icon('search')}<input name="lot" aria-label="Mã lô cần tra cứu" placeholder="LOT-2026-EU-014" value="${esc(portalId)}" required><button class="btn primary" type="submit">${t('Tra cứu lô','Find shipment')} ${icon('arrow')}</button></form><p class="footnote">${t('Mã thử: LOT-2026-EU-014; lô 015 chỉ tra cứu được sau khi công bố.','Try LOT-2026-EU-014; shipment 015 becomes visible only after publication.')}</p></div>`)}
    ${pub?`<div class="portal-grid" style="margin-top:19px"><div>
      ${card(`<div class="card-pad">${section(t('Thông tin lô hàng','Shipment overview'),`${t('Hồ sơ dữ liệu hỗ trợ · Phiên bản','Supporting dataset · Version')} ${s.version}`,tag(s))}<h2 style="font-size:21px;letter-spacing:-.5px;margin:0 0 16px">${s.id}</h2><div class="report-grid"><div class="report-metric"><small>${t('Nhà nhập khẩu','Importer')}</small><strong>${esc(s.buyer)}</strong></div><div class="report-metric"><small>${t('Khối lượng','Net weight')}</small><strong>${fmt(s.weightKg)} kg</strong></div><div class="report-metric"><small>${t('Mã HS','HS code')}</small><strong>${s.hs}</strong></div><div class="report-metric"><small>${t('Nước sản xuất','Country of production')}</small><strong>Việt Nam</strong></div><div class="report-metric"><small>${t('Số mảnh đất','Source plots')}</small><strong>${plots(s.id).length}</strong></div><div class="report-metric"><small>${t('Ngày công bố','Published')}</small><strong>${niceDate(s.publishedAt)}</strong></div></div><div class="legal-note"><strong>${t('Lưu ý pháp lý','Legal notice')}.</strong> ${t('Đây là bộ dữ liệu hỗ trợ nhà nhập khẩu EU thẩm định. Hồ sơ này không phải DDS, không thay thế quyết định thẩm định của operator và không bảo đảm được thông quan.','This pack supports EU importer due diligence. It is not a DDS, does not replace the operator’s assessment, and does not guarantee market access.')}</div><div class="export-actions">${button(t('Tải GeoJSON','Download GeoJSON'),'download-geo','btn','download')}${button(t('Tải PDF tóm tắt','Download summary PDF'),'download-pdf','btn','file')}${button(t('Danh mục bằng chứng','Evidence manifest'),'download-evidence','btn','file')}${button(t('Sao chép liên kết','Copy link'),'copy-link','btn','copy')}</div></div>`)}
      ${card(`<div class="card-pad">${section(t('Mảnh đất đóng góp','Contributing source plots'),t('Hình học WGS84 trong tệp GeoJSON.','WGS84 geometry in GeoJSON export.'))}${mapSvg(plots(s.id))}<div class="pills">${plots(s.id).map(p=>`<span class="id-pill">${p.id}</span>`).join('')}</div><p class="footnote">${t('Tọa độ chỉ mang tính minh họa, không đại diện thửa đất thực.','Coordinates are synthetic and do not identify real farm locations.')}</p></div>`)}
      ${card(`<div class="card-pad">${section(t('Yêu cầu bổ sung thông tin','Request more information'),t('Phiếu yêu cầu sẽ được ghi nhận trong bản demo.','This form creates a browser-local sample support ticket.'))}${ticketForm(s.id)}</div>`)}
    </div><div>
      ${card(`<div class="card-pad">${section(t('Mã truy cập hồ sơ','Shipment QR code'))}<div class="qr-box">${qrSvg(`${windowBase()}#/portal/${s.id}`)}<p>${s.id} · v${s.version}</p></div><button class="btn" style="width:100%;margin-top:12px" data-action="copy-link">${icon('copy')} ${t('Sao chép liên kết truy cập','Copy traceability link')}</button><div class="footnote">${t('Quét QR để mở hồ sơ trên đúng địa chỉ đang chạy demo.','Scan to open this package on the current demo origin.')}</div></div>`)}
      ${card(`<div class="card-pad">${section(t('Tính toàn vẹn dữ liệu','Dataset integrity'))}<small class="muted">SHA-256 · ${t('mã kiểm tra nội bộ','local digest')}</small><p class="hash">${esc(s.hash)}</p><button class="btn mini" data-action="verify-portal">${icon('shield')}${t('Kiểm tra SHA-256','Verify SHA-256')}</button><p class="footnote">${t('Mã băm không phải chữ ký số và không xác minh nguồn dữ liệu thực.','Hash is not a digital signature and does not validate real-world evidence.')}</p></div>`)}
      ${card(`<div class="card-pad">${section(t('Phản hồi hỗ trợ','Support requests'))}${state.tickets.filter(t=>t.shipmentId===s.id).map(k=>`<div class="ticket-card"><div class="row-between"><strong>${k.id}</strong><span class="badge ${k.status==='answered'?'good':'warn'}">${k.status==='answered'?t('Đã phản hồi','Answered'):t('Đang tiếp nhận','Open')}</span></div><div class="small">${esc(k.subject)}</div>${k.reply?`<p>${esc(k.reply)}</p>`:''}</div>`).join('')||`<p class="muted small">${t('Chưa có yêu cầu.','No tickets yet.')}</p>`}</div>`)}
    </div></div>`:`<div class="card card-pad" style="margin-top:18px"><div class="empty-state">${icon('lock')}<h3>${t('Hồ sơ chưa được công bố hoặc không tồn tại','Package unavailable or not published')}</h3><p>${t('Cổng đối tác chỉ cho phép xem những lô đã phê duyệt và công bố.','Only internally approved and published packages are accessible to importers.')}</p><p class="small">${esc(portalId)}</p></div></div>`}`;}
  function ticketForm(id){return `<form id="ticket-form" class="ticket-form"><input type="hidden" name="lot" value="${esc(id)}"><div class="row"><div><label class="form-label">${t('Chủ đề','Subject')}</label><input class="form-input" name="subject" required minlength="4" maxlength="120" placeholder="e.g. GeoJSON coordinates"></div><div><label class="form-label">${t('Liên hệ (demo)','Contact (demo)')}</label><input class="form-input" name="contact" type="email" required placeholder="name@example.com"></div></div><div><label class="form-label">${t('Nội dung','Message')}</label><textarea class="form-textarea" name="body" required minlength="10" maxlength="500" placeholder="${t('Mô tả dữ liệu cần bổ sung...','Describe the information you need...')}"></textarea></div><div class="row-between"><span class="footnote">${t('Không gửi thông tin lên máy chủ.','Stored in this browser only.')}</span><button type="submit" class="btn primary">${t('Gửi yêu cầu','Submit request')} ${icon('arrow')}</button></div></form>`;}
  function farmer(){return `<div class="farmer-wrap">${intro('FARMER ACCESS / 04','Tra cứu trạng thái vườn','Kênh thông tin giản lược cho nông hộ: tra mã vườn, xem tình trạng dữ liệu và hướng dẫn bổ sung.')}
    ${card(`<div class="farmer-card">${section('Kiểm tra dữ liệu vườn','Chỉ hiển thị tình trạng hồ sơ; không công bố danh tính hay số giấy tờ.') }<form id="farm-form" class="farmer-input"><input name="farm" value="${esc(farmId)}" placeholder="Ví dụ: DL-BH-0014" aria-label="Mã vườn" required><button class="btn primary" type="submit">Xem trạng thái ${icon('arrow')}</button></form><p class="footnote">Mã ví dụ: DL-KR-0005 · DL-BH-0013 · DL-BH-0014 · DL-KN-0017</p></div>`)}
    ${farmerResult()}
  </div>`;}
  function farmerResult(){const p=state.plots.find(x=>x.id.toUpperCase()===farmId.toUpperCase());if(!p)return card('<div class="farmer-result"><div class="empty-state">Không tìm thấy mã vườn này trong bộ dữ liệu mẫu.</div></div>');
    const geo=geometryOk(p),isOk=geo&&p.legal&&!p.warning&&p.verified,issue=!p.legal?'Chưa có giấy tờ chứng minh quyền sử dụng đất hợp lệ trong hồ sơ mẫu.':!geo?'Vườn trên 4 ha chưa được ghi nhận bằng polygon.':p.warning?'Có cảnh báo dữ liệu bản đồ, cần cán bộ xác minh hiện trường.':'Dữ liệu hồ sơ mẫu đã đầy đủ theo kiểm tra cơ bản.';
    return card(`<div class="farmer-result"><div class="eyebrow">KẾT QUẢ TRA CỨU</div><span class="badge ${isOk?'good':'warn'}">${isOk?'Hồ sơ dữ liệu đã đủ':'Cần bổ sung / xác minh'}</span><h2>${p.id}</h2><p class="muted small">${esc(issue)}</p><div class="farmer-meta"><div><small>Mã vườn</small><strong>${p.id}</strong></div><div><small>Huyện</small><strong>${esc(p.district)}, Đắk Lắk</strong></div><div><small>Diện tích khai báo</small><strong>${p.area.toLocaleString('vi-VN')} ha</strong></div><div><small>Xác minh gần nhất</small><strong>${niceDate(p.reviewDate)}</strong></div></div><strong style="font-size:12px">Hướng dẫn tiếp theo</strong><ol class="farmer-instructions">${!p.legal?'<li>Chuẩn bị bản sao giấy chứng nhận quyền sử dụng đất hoặc xác nhận của UBND cấp có thẩm quyền.</li>':''}${!geo?'<li>Liên hệ cán bộ vùng nguyên liệu để đo và cập nhật ranh giới vườn trên 4 ha.</li>':''}${p.warning?'<li>Chờ cán bộ GIS và pháp chế kiểm tra thực địa; cảnh báo chưa phải kết luận vi phạm.</li>':''}${isOk?'<li>Duy trì thông tin vùng trồng cập nhật khi thay đổi diện tích hoặc giấy tờ.</li>':''}<li>Đưa mã vườn này cho cán bộ thu mua khi cần đối chiếu hồ sơ.</li></ol><div class="notice">Dữ liệu ẩn danh và hoàn toàn giả lập. Kết quả không quyết định quyền bán hàng hay kết luận tuân thủ EUDR.</div></div>`);}
  function ticketsPage(){if(!['ops','legal'].includes(role))return `<div class="restricted">${icon('lock')}Chỉ vai trò nội bộ mới xem được danh sách yêu cầu hỗ trợ.</div>`;
    return `${intro('SERVICE DESK / 05','Yêu cầu hỗ trợ','Tiếp nhận, theo dõi và ghi nhận phản hồi các yêu cầu bổ sung thông tin theo lô.',button('Đặt lại dữ liệu demo','reset','btn','refresh'))}
      ${card(`<div class="card-pad">${section('Hộp thư yêu cầu',`${state.tickets.length} phiếu; ${metrics().openTickets} phiếu đang mở.`)}${state.tickets.map(tk=>`<div class="ticket-card"><div class="row-between"><div><h3>${tk.id} · ${esc(tk.subject)}</h3><div class="meta">${esc(tk.shipmentId)} · ${niceDate(tk.createdAt)} · ${esc(tk.contact)}</div></div><span class="badge ${tk.status==='answered'?'good':'warn'}">${tk.status==='answered'?'Đã phản hồi':'Đang tiếp nhận'}</span></div><p class="ticket-body">${esc(tk.body)}</p>${tk.reply?`<div class="notice"><strong>Phản hồi:</strong> ${esc(tk.reply)}</div>`:''}${tk.status!=='answered'?`<form class="ticket-respond" data-ticket="${tk.id}"><input required name="reply" class="form-input" placeholder="Nhập nội dung phản hồi (mô phỏng)"><button class="btn primary" type="submit">Gửi phản hồi</button></form>`:''}</div>`).join('')||'<p>Chưa có yêu cầu hỗ trợ.</p>'}</div>`)}
    <div class="notice">Mức SLA đề xuất: phản hồi trong ≤ 24 giờ làm việc. Bản demo ghi nhận trạng thái tại trình duyệt, không tự gửi email và không đo SLA trên hạ tầng thật.</div>`;}
  const root=$('#content');
  function render(){if(view==='detail'&&!['ops','legal'].includes(role))view=role==='buyer'?'portal':'farmer';
    $('#role-select').value=role;$('#avatar').textContent=({ops:'VH',legal:'PC',buyer:'EU',farmer:'NH'})[role];
    $('#ticket-count').textContent=String(metrics().openTickets).padStart(2,'0');
    const titles={overview:'Tổng quan',shipments:'Lô xuất khẩu',detail:'Chi tiết lô',portal:'Cổng đối tác EU',farmer:'Tra cứu nông hộ',tickets:'Yêu cầu hỗ trợ'};
    $('#breadcrumb').textContent=titles[view];document.title=`${titles[view]} | EUDR TraceHub`;
    document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===view||(view==='detail'&&b.dataset.view==='shipments')));
    root.innerHTML=({overview,shipments:shipmentsPage,detail,portal,farmer,tickets:ticketsPage})[view]();
  }
  function go(next,scroll=true){view=next;render();if(scroll)window.scrollTo({top:0,behavior:'instant'});}
  function createHistory(s,action,actor){s.history=s.history||[];s.history.unshift({action,date:new Date().toLocaleString('vi-VN'),actor});log(action,s.id);save();}
  function permitted(want){if(role!==want){notify(`Vui lòng chuyển vai trò sang ${want==='legal'?'Pháp chế phê duyệt':'Vận hành xuất khẩu'}.`);return false;}return true;}
  function safeMutation(fn){try{fn();save();render();}catch(err){notify(err.message||'Không thể thực hiện thao tác');console.error(err);}}
  async function approveOrPublish(action){const s=getShip(selectedId),st=status(s);
    if(action==='create-draft'&&permitted('ops')&&st==='ready'){s.status='draft';s.pendingVersion=(s.version||0)+1;createHistory(s,'Tạo bản nháp hồ sơ','Vận hành (mô phỏng)');notify('Đã tạo bản nháp, chờ vai trò Pháp chế phê duyệt.');render();}
    else if(action==='approve'&&permitted('legal')&&st==='draft'){if(runChecks(s).some(x=>!x.ok)){notify('Không thể phê duyệt khi còn quy tắc chưa đạt.');return;}s.status='approved';s.approvedAt=now();s.approvedBy='Pháp chế (mô phỏng)';createHistory(s,'Phê duyệt hồ sơ mẫu',s.approvedBy);notify('Hồ sơ đã được phê duyệt trong quy trình giả lập.');render();}
    else if(action==='publish'&&permitted('ops')&&st==='approved'){
      if(runChecks(s).some(x=>!x.ok)){notify('Hồ sơ không còn đạt 7/7 quy tắc.');return;}
      try{const snapshot=packageSnapshot(s),hash=await digest(snapshot);s.version=s.pendingVersion;s.status='published';s.hash=hash;s.publishedSnapshot=snapshot;s.publishedAt=now();s.versions=s.versions||[];s.versions.unshift({version:s.version,hash,date:s.publishedAt,snapshot});createHistory(s,`Công bố Shipment Pack v${s.version}`,'Vận hành (mô phỏng)');notify(`Đã công bố phiên bản ${s.version} với SHA-256 và QR.`);render();}catch(err){notify(err.message||'Không tạo được hash SHA-256.');}
    }else if(action==='revise'&&permitted('ops')&&st==='published'){s.status='draft';s.pendingVersion=s.version+1;createHistory(s,`Khởi tạo bản sửa đổi v${s.pendingVersion}`,'Vận hành (mô phỏng)');notify('Bản nháp sửa đổi được tạo; bản đã công bố trước đây vẫn được giữ trong lịch sử.');render();}
  }
  async function verifyHash(s){if(!s?.hash||!s?.publishedSnapshot){notify('Chưa có bản công bố để đối chiếu.');return;}try{const actual=await digest(s.publishedSnapshot);notify(actual===s.hash?'SHA-256 khớp với ảnh chụp dữ liệu khi công bố (mô phỏng).':'Cảnh báo: mã băm không khớp ảnh chụp dữ liệu.');}catch(e){notify(e.message);}}
  function fixPolygon(plotId){if(!permitted('ops'))return;const p=state.plots.find(x=>x.id===plotId);if(!p)return;const [x,y]=p.geometry.coordinates,d=.0022;p.geometry={type:'Polygon',coordinates:[[[x-d,y-d],[x+d,y-d],[x+d,y+d],[x-d,y+d],[x-d,y-d]]]};createHistory(getShip(selectedId),`Bổ sung polygon giả lập cho ${plotId}`,'Vận hành');notify('Đã bổ sung hình học mẫu. Cần xác minh tài liệu thật khi triển khai.');render();}
  function fixLegal(plotId){if(!permitted('ops'))return;const p=state.plots.find(x=>x.id===plotId);if(!p)return;p.legal=true;createHistory(getShip(selectedId),`Đánh dấu nhận hồ sơ đất mẫu ${plotId}`,'Vận hành');notify('Đã đánh dấu hồ sơ mẫu; thao tác không xác thực quyền sử dụng đất.');render();}
  function fixWeight(){if(!permitted('ops'))return;const s=getShip(selectedId),sum=receipts(s.id).reduce((a,b)=>a+b.weightKg,0);s.weightKg=sum;for(const w of warehouses(s.id))w.weightKg=sum;createHistory(s,`Đối chiếu lô kho/lô xuất về ${fmt(sum)} kg trong bộ mẫu`,'Vận hành');notify('Khối lượng mẫu đã đồng nhất. Không thay đổi chứng từ hàng thật.');render();}
  function fixRisk(plotId){if(!permitted('legal'))return;const p=state.plots.find(x=>x.id===plotId);if(!p)return;if(!confirm(`Mô phỏng cán bộ chuyên trách hoàn tất thẩm tra thủ công cho ${plotId}? Đây KHÔNG phải xác minh mất rừng thật.`))return;p.warning=false;p.verified=true;p.forestChecked=true;p.forestStatus='Giả định hoàn tất xác minh thủ công';createHistory(getShip(selectedId),`Đóng cảnh báo mẫu ${plotId} sau phê duyệt giả lập`,'Pháp chế');notify('Đã mô phỏng đóng cảnh báo; chưa kết luận về dữ liệu vệ tinh thực.');render();}
  function downloadEvidence(){const s=getShip(portalId);if(!s||status(s)!=='published'){notify('Hồ sơ chưa công bố.');return;}const manifest={notice:'SYNTHETIC METADATA ONLY - NO REAL LEGAL DOCUMENTS ATTACHED',shipment_id:s.id,version:s.version,plots:plots(s.id).map(p=>({plot_id:p.id,evidence_reference:`DOC-DEMO-${p.id}`,evidence_type:'Land-right evidence (academic placeholder)',document_real:false,checked_in_sample:p.legal,consent_logged_in_sample:p.consent}))};download(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}),`EUDR_${s.id}_evidence_manifest.json`);notify('Đã xuất danh mục bằng chứng giả lập, không có giấy tờ thật.');}
  function downloadGeo(){const s=getShip(portalId);if(!s||status(s)!=='published'){notify('Hồ sơ chưa công bố.');return;}const blob=new Blob([JSON.stringify(geoCollection(s.id),null,2)],{type:'application/geo+json'});download(blob,`EUDR_${s.id}_v${s.version}.geojson`);notify('Đã tạo tệp GeoJSON WGS84 từ dữ liệu mẫu.');}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}
  function changeRole(value){role=value;if(value==='buyer')go('portal');else if(value==='farmer')go('farmer');else go('overview');}
  document.querySelector('#role-select').addEventListener('change',e=>changeRole(e.target.value));
  document.querySelector('#main-nav').addEventListener('click',e=>{const btn=e.target.closest('[data-view]');if(!btn)return;let v=btn.dataset.view;if(v==='portal')role='buyer';else if(v==='farmer')role='farmer';else if(role==='buyer'||role==='farmer')role='ops';go(v);});
  root.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,id=btn.dataset.id;
    switch(action){
      case 'view-shipments':go('shipments');break;
      case 'open-shipment':selectedId=id;go('detail');break;
      case 'filter':filter=btn.dataset.filter;render();break;
      case 'open-portal':portalId=selectedId;role='buyer';go('portal');break;
      case 'lang':portalLang=btn.dataset.lang;render();break;
      case 'create-draft':case 'approve':case 'publish':case 'revise':await approveOrPublish(action);break;
      case 'fix-polygon':fixPolygon(id);break;
      case 'fix-legal':fixLegal(id);break;
      case 'fix-weight':fixWeight();break;
      case 'fix-risk':fixRisk(id);break;
      case 'plot-info':notify(`${id} · tọa độ và hình học giả lập.`);break;
      case 'download-geo':downloadGeo();break;
      case 'download-evidence':downloadEvidence();break;
      case 'download-pdf':{const s=getShip(portalId);if(s&&status(s)==='published'){TraceHubPDF.download(s,plots(s.id),runChecks(s),s.hash);notify('Đã tải tệp PDF tiếng Anh (dữ liệu giả lập).');}break;}
      case 'copy-link':{const u=`${windowBase()}#/portal/${portalId}`;try{await navigator.clipboard.writeText(u);notify('Đã sao chép liên kết cổng đối tác.');}catch(_){notify(`Liên kết: ${u}`);}break;}
      case 'verify-hash':await verifyHash(getShip(selectedId));break;
      case 'verify-portal':await verifyHash(getShip(portalId));break;
      case 'reset':if(confirm('Khôi phục toàn bộ dữ liệu demo về trạng thái ban đầu?')){localStorage.removeItem(KEY);state=initial();await seedHash();search='';filter='all';notify('Đã khôi phục dữ liệu gốc.');go('overview');}break;
    }
  });
  root.addEventListener('input',e=>{if(e.target.id==='shipment-search'){search=e.target.value;const curPos=e.target.selectionStart;const start=window.scrollY;render();const input=$('#shipment-search');if(input){input.focus();input.setSelectionRange(curPos,curPos);}window.scrollTo(0,start);}});
  root.addEventListener('submit',e=>{e.preventDefault();const form=e.target,dat=new FormData(form);
    if(form.id==='lookup-form'){portalId=String(dat.get('lot')||'').trim().toUpperCase();render();}
    else if(form.id==='farm-form'){farmId=String(dat.get('farm')||'').trim().toUpperCase();render();}
    else if(form.id==='ticket-form'){
      const sh=getShip(String(dat.get('lot')));if(!sh||status(sh)!=='published'){notify('Không có hồ sơ hợp lệ để tạo phiếu.');return;}
      const id='TK-'+String(Math.max(0,...state.tickets.map(t=>Number(t.id.slice(3))))+1).padStart(4,'0');
      state.tickets.unshift({id,shipmentId:sh.id,subject:String(dat.get('subject')).trim(),body:String(dat.get('body')).trim(),contact:String(dat.get('contact')).trim(),status:'open',reply:'',createdAt:now()});log('Tiếp nhận yêu cầu '+id,sh.id);save();notify(`Đã tiếp nhận ${id}; lưu cục bộ trên trình duyệt.`);render();
    }else if(form.classList.contains('ticket-respond')){
      if(!['ops','legal'].includes(role)){notify('Không có quyền phản hồi.');return;}
      const tk=state.tickets.find(t=>t.id===form.dataset.ticket);if(!tk)return;tk.reply=String(dat.get('reply')).trim();tk.status='answered';tk.answeredAt=now();log('Phản hồi '+tk.id,tk.shipmentId);save();notify(`Đã phản hồi ${tk.id} (mô phỏng).`);render();
    }
  });
  function fromHash(){const match=location.hash.match(/^#\/portal\/(LOT-\d{4}-EU-\d{3})$/i);if(match){portalId=match[1].toUpperCase();role='buyer';view='portal';}}
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#/portal/')){fromHash();render();}});
  async function init(){fromHash();try{await seedHash();}catch(e){console.warn('Hash initialization unavailable:',e);}render();}
  init();
  window.TraceHubDemo={getState:()=>clone(state),runChecks:(id)=>runChecks(getShip(id)),reset:async()=>{localStorage.removeItem(KEY);state=initial();await seedHash();render();}};
})();
