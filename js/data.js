/* EUDR TraceHub — Academic sample dataset. All personal names, measurements, locations and documents are invented. */
(function () {
  const zones = [
    { id:'DL-KR', district:'Krông Năng', center:[108.400,12.996] },
    { id:'DL-BH', district:'Buôn Hồ', center:[108.257,12.923] },
    { id:'DL-KN', district:'Krông Năng', center:[108.443,12.997] }
  ];
  const ids = Array.from({length:20},(_,i)=>i+1);
  const areas=[2.2,2.5,2.8,2.5,2.9,2.7,2.4,3.1,2.8,3.0,2.8,2.3,5.2,1.7,2.0,2.5,2.6,2.4,2.3,1.9];
  const plots=ids.map(i=>{
    const zone=i<=11?zones[0]:i<=15?zones[1]:zones[2];
    const n=i<=11?i:i<=15?i-11:i-15;
    const lon=zone.center[0]+((n%4)-1.5)*.013+(Math.floor(n/4)%2)*.003;
    const lat=zone.center[1]+(Math.floor(n/4)-1)*.011+(n%3)*.002;
    const pad=0.0016+(i%3)*.00027;
    const polygon={type:'Polygon',coordinates:[[[lon-pad,lat-pad*.60],[lon+pad*.78,lat-pad*.64],[lon+pad,lat+pad*.83],[lon-pad*.84,lat+pad],[lon-pad,lat-pad*.60]]]};
    const id=i<=11?`DL-KR-${String(i).padStart(4,'0')}`:i<=15?`DL-BH-${String(i).padStart(4,'0')}`:`DL-KN-${String(i).padStart(4,'0')}`;
    return {
      id,area:areas[i-1],district:zone.district,province:'Đắk Lắk',year:2011+(i%6),
      geometry: i===13?{type:'Point',coordinates:[lon,lat]}:polygon,
      legal: i!==14,verified:!([17,18].includes(i)),warning:[17,18].includes(i),
      consent:true, forestChecked:i<=16||i>=19, forestStatus:[17,18].includes(i)?'Đang xác minh':'Không phát hiện cảnh báo trong dữ liệu mẫu',
      capacity:Math.round(areas[i-1]*2900),certification:i<=11?'4C (minh họa)':'Chưa khai báo',
      reviewDate:'2026-10-12',farmerInternal:`Nông hộ mô phỏng số ${String(i).padStart(2,'0')}`
    };
  });
  const assignments=[
    ['014',[1,2,3,4],[4800,4800,4800,4800]],
    ['015',[5,6,7,8,9,10,11],[5400,5600,5100,5800,5300,5500,5700]],
    ['016',[12,13,14,15],[5100,4800,4550,4200]],
    ['017',[16,17,18,19],[5200,5000,4600,4400]]
  ];
  const receipts=[];
  assignments.forEach(([suffix,idxs,weights])=>idxs.forEach((plotNum,index)=>{
    receipts.push({id:`REC-2026-${suffix}-${String(index+1).padStart(2,'0')}`,plotId:plots[plotNum-1].id,weightKg:weights[index],date:'2026-10-03',shipmentId:`LOT-2026-EU-${suffix}`});
  }));
  const warehouses=[
    {id:'WH-2026-014-A',shipmentId:'LOT-2026-EU-014',weightKg:19200},
    {id:'WH-2026-015-A',shipmentId:'LOT-2026-EU-015',weightKg:20000},
    {id:'WH-2026-015-B',shipmentId:'LOT-2026-EU-015',weightKg:18400},
    {id:'WH-2026-016-A',shipmentId:'LOT-2026-EU-016',weightKg:19200},
    {id:'WH-2026-017-A',shipmentId:'LOT-2026-EU-017',weightKg:19200}
  ];
  const shipments=[
    {id:'LOT-2026-EU-014',buyer:'Nordic Coffee Import GmbH',destination:'Hamburg, Đức',container:'05 × 20ft',sku:'Cà phê nhân Robusta',hs:'0901.11',productionCountry:'Việt Nam',productionTime:'Niên vụ 2025/2026',weightKg:19200,sailingDate:'2026-11-02',status:'published',version:1,publishedAt:'2026-10-18T15:10:00',approvedAt:'2026-10-17T14:00:00',approvedBy:'Pháp chế mô phỏng',hash:'',history:[{action:'Công bố hồ sơ',date:'2026-10-18 15:10',actor:'Vận hành (dữ liệu mẫu)'},{action:'Phê duyệt nội bộ',date:'2026-10-17 14:00',actor:'Pháp chế (dữ liệu mẫu)'}]},
    {id:'LOT-2026-EU-015',buyer:'Elbe Roasters GmbH',destination:'Hamburg, Đức',container:'02 × 20ft',sku:'Cà phê nhân Robusta',hs:'0901.11',productionCountry:'Việt Nam',productionTime:'Niên vụ 2025/2026',weightKg:38400,sailingDate:'2026-11-16',status:'ready',version:0,publishedAt:null,approvedAt:null,approvedBy:'',hash:'',history:[]},
    {id:'LOT-2026-EU-016',buyer:'Torino Coffee S.r.l.',destination:'Genoa, Ý',container:'01 × 20ft',sku:'Cà phê nhân Robusta',hs:'0901.11',productionCountry:'Việt Nam',productionTime:'Niên vụ 2025/2026',weightKg:19200,sailingDate:'2026-11-19',status:'blocked',version:0,publishedAt:null,approvedAt:null,approvedBy:'',hash:'',history:[]},
    {id:'LOT-2026-EU-017',buyer:'Costa Verde Coffee S.L.',destination:'Valencia, Tây Ban Nha',container:'01 × 20ft',sku:'Cà phê nhân Robusta',hs:'0901.11',productionCountry:'Việt Nam',productionTime:'Niên vụ 2025/2026',weightKg:19200,sailingDate:'2026-11-22',status:'blocked',version:0,publishedAt:null,approvedAt:null,approvedBy:'',hash:'',history:[]}
  ];
  window.DEMO_DATA={plots,receipts,warehouses,shipments,zones,version:'2.0.0'};
})();
