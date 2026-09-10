/* Shared deterministic calculations and validation. No network, UI, or AI. */
var ClinicalCore = (function () {
  'use strict';
  const VERSION = '5.0.0-rc1';
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function number(value, name, min, max) {
    requireValue(value !== '' && value !== null && value !== undefined, 'กรุณาระบุ ' + name);
    const n = Number(value);
    requireValue(Number.isFinite(n) && n >= min && n <= max, name + ' ต้องอยู่ระหว่าง ' + min + '–' + max);
    return n;
  }
  function text(value, name, max, required) {
    requireValue(typeof value === 'string', name + ' ต้องเป็นข้อความ');
    const t = value.trim();
    requireValue(t.length <= max && (!required || t.length > 0), 'ตรวจสอบ ' + name + ' (ไม่เกิน ' + max + ' ตัวอักษร)');
    return t;
  }
  function date(value, name) {
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value || ''), 'กรุณาระบุ ' + name);
    const parsed = new Date(value + 'T00:00:00Z');
    requireValue(Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value, name + ' ไม่ถูกต้อง');
    requireValue(+parsed <= Date.now() + 86400000, name + ' อยู่ในอนาคต');
    return value;
  }
  function normalizePatient(p) {
    requireValue(p && typeof p === 'object' && !Array.isArray(p), 'ไม่พบข้อมูลเคส');
    const out = {};
    for (const k of ['caseId','setting','sex','pregnancy','lactation','renalStatus','scrUnit','allergyStatus']) out[k] = text(p[k] || '', k, 80, true);
    requireValue(/^case-[a-zA-Z0-9-]{8,60}$/.test(out.caseId), 'รหัสเคสไม่ถูกต้อง');
    requireValue(['pharmacy','hospital'].includes(out.setting), 'สถานที่ใช้งานไม่ถูกต้อง');
    requireValue(['M','F','unknown'].includes(out.sex), 'ตรวจสอบเพศสำหรับสูตร');
    for (const k of ['pregnancy','lactation']) requireValue(['yes','no','unknown'].includes(out[k]), 'ตรวจสอบ ' + k);
    requireValue(['stable','aki','dialysis','unknown'].includes(out.renalStatus), 'ตรวจสอบภาวะไต');
    requireValue(['unknown','none','known'].includes(out.allergyStatus), 'ตรวจสอบสถานะแพ้ยา');
    requireValue(['mg/dL','umol/L'].includes(out.scrUnit), 'หน่วย SCr ไม่ถูกต้อง');
    for (const [k, min, max] of [['age',0,120],['weight',0.2,500],['height',20,250],['scr',0.01,2500],['dosingWeight',0.2,500]]) out[k] = p[k] === '' || p[k] == null ? '' : number(p[k], k, min, max);
    for (const k of ['diagnosis','allergies','medications','supplements','labs','notes']) out[k] = text(p[k] || '', k, k === 'medications' || k === 'labs' ? 12000 : 4000, false);
    out.scrDate = p.scrDate ? date(p.scrDate, 'วันที่ตรวจ SCr') : '';
    out.weightBasis = text(p.weightBasis || '', 'เหตุผลการเลือกน้ำหนัก', 300, false);
    out.childPugh = text(p.childPugh || '', 'Child-Pugh', 20, false);
    requireValue(['','A','B','C','unknown'].includes(out.childPugh), 'Child-Pugh ไม่ถูกต้อง');
    requireValue(out.allergyStatus !== 'known' || !!out.allergies, 'ระบุยาที่แพ้และอาการ');
    requireValue(out.allergyStatus !== 'none' || !out.allergies, 'สถานะไม่แพ้ยาขัดกับรายการแพ้ยา');
    return out;
  }
  function renal(p) {
    p = normalizePatient(p);
    requireValue(p.renalStatus === 'stable', 'สูตรนี้ใช้เมื่อการทำงานของไตคงที่เท่านั้น ไม่ใช้ใน AKI/ฟอกไต/ยังไม่ทราบ');
    requireValue(p.pregnancy === 'no', 'สูตรนี้ไม่รองรับการตั้งครรภ์หรือยังไม่ทราบสถานะ');
    const age = number(p.age, 'อายุสำหรับสูตรผู้ใหญ่', 18, 120);
    requireValue(['M','F'].includes(p.sex), 'ระบุเพศที่ใช้ในสมการ');
    const raw = number(p.scr, 'SCr', 0.01, 2500), scr = p.scrUnit === 'umol/L' ? raw / 88.4 : raw;
    requireValue(scr >= 0.1 && scr <= 30, 'SCr หลังแปลงหน่วยอยู่นอกช่วงตรวจสอบ 0.1–30 mg/dL');
    date(p.scrDate, 'วันที่ตรวจ SCr');
    const k = p.sex === 'F' ? 0.7 : 0.9, a = p.sex === 'F' ? -0.241 : -0.302;
    const egfr = 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(0.9938, age) * (p.sex === 'F' ? 1.012 : 1);
    const result = {egfr, egfrUnit:'mL/min/1.73 m²', formula:'CKD-EPI 2021 creatinine', scrMgDl:scr, scrDate:p.scrDate, crcl:null, crclUnit:'mL/min', bsa:null, absoluteEgfr:null, warnings:['เป็นค่าประมาณจาก SCr; ไม่ใช้สรุปว่าเป็น CKD จากผลครั้งเดียว','เลือกสมการตามฉลากยา/แนวทางของยานั้น โดยเฉพาะค่าที่ใกล้จุดตัด']};
    if (p.dosingWeight !== '') {
      requireValue(!!p.weightBasis, 'ระบุเหตุผล/แหล่งอ้างอิงของน้ำหนักที่เลือกใช้ใน CG');
      result.crcl = ((140 - age) * p.dosingWeight) / (72 * scr) * (p.sex === 'F' ? 0.85 : 1);
      result.crclFormula = 'Cockcroft-Gault'; result.dosingWeight = p.dosingWeight; result.weightBasis = p.weightBasis;
    }
    if (p.height !== '' && p.weight !== '') {
      result.bsa = Math.sqrt(p.height * p.weight / 3600);
      result.absoluteEgfr = egfr * result.bsa / 1.73;
    }
    if (Date.now() - Date.parse(p.scrDate + 'T00:00:00Z') > 7 * 86400000) result.warnings.push('ผล SCr เกิน 7 วัน: ต้องประเมินว่าเหมาะกับสภาวะปัจจุบันหรือไม่ (ไม่ใช่เกณฑ์ความถี่ตรวจสากล)');
    return result;
  }
  function dose(p) {
    const weight = number(p.weight, 'น้ำหนัก', 0.2, 500), perKg = number(p.perKg, 'ขนาด mg/kg', 0.000001, 10000);
    const frequency = number(p.frequency, 'จำนวนครั้ง/วัน', 1, 24);
    requireValue(Number.isInteger(frequency), 'จำนวนครั้ง/วันต้องเป็นจำนวนเต็ม');
    requireValue(['day','dose'].includes(p.basis), 'เลือก mg/kg/day หรือ mg/kg/dose');
    const concentrationMg = number(p.concentrationMg, 'ปริมาณยา mg', 0.000001, 100000);
    const concentrationMl = number(p.concentrationMl, 'ปริมาตร mL', 0.000001, 100000);
    const maxSingle = number(p.maxSingle, 'ขนาดสูงสุด/ครั้ง mg', 0.000001, 100000);
    const maxDaily = number(p.maxDaily, 'ขนาดสูงสุด/วัน mg', 0.000001, 1000000);
    const singleMg = weight * perKg / (p.basis === 'day' ? frequency : 1), dailyMg = singleMg * frequency;
    const exceeds = singleMg > maxSingle + 1e-9 || dailyMg > maxDaily + 1e-9;
    return {singleMg,dailyMg,ml:singleMg / (concentrationMg / concentrationMl),exceeds,maxSingle,maxDaily,
      formula:'(' + weight + ' kg × ' + perKg + ' mg/kg' + (p.basis === 'day' ? ' ÷ ' + frequency : '') + ') ÷ (' + concentrationMg + ' mg ÷ ' + concentrationMl + ' mL)',
      warning:exceeds?'เกินขนาดสูงสุดที่ผู้ใช้ระบุ — ห้ามนำผลนี้ไปออกฉลาก':'ผลเลขคณิตเท่านั้น ต้องตรวจข้อบ่งใช้ อายุ การทำงานของอวัยวะ ความเข้มข้นจริง และการปัดให้เหมาะกับอุปกรณ์'};
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function safeUrl(s) {
    return typeof s === 'string' && /^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:[/?#][^\s<>"']*)?$/.test(s) ? s : '';
  }
  function scrub(value) {
    if (typeof value === 'string') return value.replace(/\b\d-\d{4}-\d{5}-\d{2}-\d\b|\b\d{13}\b/g,'[ID removed]').replace(/\b(?:HN|AN)\s*[:#]?\s*\d{3,15}\b/gi,'[record ID removed]').replace(/\b0\d{8,9}\b/g,'[phone removed]');
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') { const out={}; for (const k of Object.keys(value)) out[k]=scrub(value[k]); return out; }
    return value;
  }
  function orders(rows) {
    requireValue(Array.isArray(rows) && rows.length > 0 && rows.length <= 50, 'ต้องมีรายการยาที่ตรวจแล้ว 1–50 รายการ');
    return rows.map(r=>({name:text(r.name,'ชื่อยาและความแรง',200,true),instruction:text(r.instruction,'วิธีใช้',500,true),quantity:text(r.quantity,'จำนวนจ่าย/ระยะเวลา',100,true),warning:text(r.warning || '','คำเตือน',500,false)}));
  }
  return {VERSION,requireValue,number,text,date,normalizePatient,renal,dose,canonical,safeUrl,scrub,orders};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ClinicalCore;
