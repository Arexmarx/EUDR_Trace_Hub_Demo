/* Tiny, dependency-free PDF generator. Exports an English, one-page summary.
   The file is a supporting shipment DATA SUMMARY, never an official EU DDS. */
(function(){
  const ascii=(x)=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^\x20-\x7e]/g,'?');
  const safe=(v)=>ascii(v).replace(/[\\()]/g,'\\$&');
  const z=(n)=>Number(n).toFixed(2).replace(/\.00$/,'');
  window.TraceHubPDF={
    download(shipment,plots,rules,hash){
      const cmd=[];
      const rect=(x,y,w,h,r,g,b)=>cmd.push(`${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f`);
      const line=(x1,y1,x2,y2)=>cmd.push(`0.84 0.89 0.86 RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);
      const text=(x,y,content,size=10,bold=false,r=.18,g=.28,b=.22)=>cmd.push(`${r} ${g} ${b} rg BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${safe(content)}) Tj ET`);
      rect(0,0,595,842,1,1,1);rect(0,734,595,108,.075,.235,.19);
      text(38,797,'TRACEHUB  /  SIMEXCO',12,true,1,1,1);
      text(38,773,'EUDR SHIPMENT DATA PACKAGE',21,true,1,1,1);
      text(38,751,'ACADEMIC DEMONSTRATION  -  NOT AN EU DDS',9,false,.77,.90,.80);
      text(38,704,'SHIPMENT IDENTIFICATION',10,true,.15,.39,.27);line(38,694,557,694);
      const rows=[['Shipment ID',shipment.id],['Destination',shipment.destination],['Importer',shipment.buyer],['Product / HS','Green coffee (Robusta) / '+shipment.hs],['Origin','Viet Nam - Dak Lak'],['Net weight',Number(shipment.weightKg).toLocaleString('en-US')+' kg'],['Production period',shipment.productionTime],['Version',`v${shipment.version} / Published ${shipment.publishedAt?.slice(0,10)||'-'}`]];
      rows.forEach(([label,value],i)=>{let y=675-i*24;text(38,y,label,9,false,.49,.56,.50);text(179,y,value,10,true,.18,.27,.22)});
      text(38,471,'DATA QUALITY CHECKS (R1-R7)',10,true,.15,.39,.27);line(38,461,557,461);
      rules.forEach((r,i)=>{let y=442-i*21;text(38,y,`R${i+1}  ${r.shortEn}`,9.2,false,.20,.31,.25);text(496,y,r.ok?'PASS':'HOLD',9.2,true,r.ok?.16:.65,r.ok?.43:.26,r.ok?.29:.21)});
      text(38,269,'SOURCE PLOTS',10,true,.15,.39,.27);line(38,258,557,258);
      plots.slice(0,9).forEach((p,i)=>{const row=Math.floor(i/3), col=i%3;text(39+col*174,240-row*19,`${p.id}   ${z(p.area)} ha`,9,false,.30,.41,.34)});
      const shortHash=hash?hash.slice(0,48):'Not published';
      text(38,166,'INTEGRITY / SHA-256 (DEMONSTRATION)',10,true,.15,.39,.27);
      text(38,146,shortHash,9,false,.3,.39,.32);
      if(hash)text(38,132,hash.slice(48),9,false,.3,.39,.32);
      line(38,113,557,113);
      text(38,98,'For EU operator due-diligence preparation only. No automated legal conclusion.',8,false,.47,.55,.50);
      text(38,83,'Simulated data. No connection to any Simexco production system or EU portal.',8,false,.47,.55,.50);
      text(38,48,`EUDR TraceHub  |  ${shipment.id}`,8,true,.34,.51,.38);
      text(506,48,'Page 1 / 1',8,false,.50,.59,.52);
      const stream=cmd.join('\n')+'\n';
      const objs=[null,
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
      ];
      let raw='%PDF-1.4\n%TraceHub academic export\n';const positions=[0];
      for(let i=1;i<objs.length;i++){positions[i]=raw.length;raw+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
      const xref=raw.length;raw+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;
      for(let i=1;i<objs.length;i++)raw+=`${String(positions[i]).padStart(10,'0')} 00000 n \n`;
      raw+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const blob=new Blob([raw],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`EUDR_ShipmentPack_${shipment.id}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
  };
})();
