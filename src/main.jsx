import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './styles.css';

import logoImage from './assets/atomplus-logo.png';
import stampSignatureImage from './assets/company-stamp-signature.png';

const LOGO_PATH = logoImage;
const STAMP_SIGNATURE_PATH = stampSignatureImage;
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key && !url.includes('YOUR_PROJECT') ? createClient(url, key) : null;

// These IDs must match the authorized accounts configured in Supabase RLS/RPC.
const MANAGER_ID = '2adabae2-930f-4521-a689-eb13ecf3618a';
const COMPANY = {
  name: 'ATOMPLUS TECHNOLOGIES PVT.LTD',
  address1: 'FLOOR NO: 3rd FLOOR, BUILDING NO/FLAT: SY NO 91/1,',
  address2: 'VIRGONAGAR POST, BIDARAHALLI HOBLI, BOMMENAHALLI VILLAGE,',
  address3: 'BENGALURU, KARNATAKA-560049',
  gst: 'GST: 29AAXCA5871B1Z8',
  website: 'https://atomplus.in'
};

const blank = () => ({
  dc_date: new Date().toISOString().slice(0, 10), dc_number: '', from_address: '', to_address: '',
  transport_mode: 'Own Vehicle', other_transport_mode: '', vehicle_number: '', driver_name: '',
  driver_phone: '', receiver_name: '', receiver_phone: '', purchase_order: '', dispatch_doc_no: '',
  mode_of_payment: '', terms_of_delivery: 'Our own materials moved from one site to another site',
  other_references: '', materials: [{ name: '', hsn: '', qty: '', unit: 'Nos', rate: '' }]
});
const fmtDate = s => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN') : '';
const clean = v => String(v ?? '').trim();
const money = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TruckGraphic() {
  return <svg className="truck-graphic" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 220V150H90V220H130V120H170V220H230V100H280V220H340V140H380V220H450V220Z" fill="#0d593b" opacity=".5"/>
    <path d="M-20 280 C150 280 200 180 520 180" stroke="#fff" strokeWidth="36" opacity=".2" strokeLinecap="round"/>
    <path d="M-20 280 C150 280 200 180 520 180" stroke="#fff" strokeWidth="2" strokeDasharray="12 12" opacity=".6"/>
    <g transform="translate(160 185)"><rect width="130" height="70" rx="6" fill="#fff"/><rect x="10" y="10" width="110" height="50" rx="3" fill="#E8EFEC"/><rect x="45" y="20" width="30" height="30" rx="6" fill="#0b4d33"/><text x="60" y="40" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">DC</text><path d="M130 20H160L180 45V70H130Z" fill="#2E7D5B"/><path d="M142 26H158L170 42H142Z" fill="#A3D9C9"/><circle cx="30" cy="72" r="16" fill="#1F2923"/><circle cx="30" cy="72" r="7" fill="#E8EFEC"/><circle cx="100" cy="72" r="16" fill="#1F2923"/><circle cx="100" cy="72" r="7" fill="#E8EFEC"/><circle cx="155" cy="72" r="16" fill="#1F2923"/><circle cx="155" cy="72" r="7" fill="#E8EFEC"/></g>
  </svg>;
}

function App() {
  const [session, setSession] = useState(null), [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false), [newPassword, setNewPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false), [form, setForm] = useState(blank);
  const [records, setRecords] = useState([]), [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''), [active, setActive] = useState('dashboard');
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [isError, setIsError] = useState(false);
  const notify = (m, e = false) => { setMessage(m); setIsError(e); };
  const isManager = session?.user?.id === MANAGER_ID;

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const recovery = hash.get('type') === 'recovery' || query.get('type') === 'recovery';
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') { setRecoveryMode(true); setNewPassword(''); setPassword(''); setMessage(''); }
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) notify(error.message, true);
      setSession(data.session);
      if (recovery && data.session) setRecoveryMode(true);
      setAuthReady(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session && supabase && !recoveryMode) loadRecords(); }, [session, recoveryMode]);

  async function loadRecords() {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.from('delivery_challans').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) notify(error.message, true); else setRecords(data || []);
    setBusy(false);
  }
  async function authSubmit(e) {
    e.preventDefault();
    if (!supabase) return notify('Supabase is not configured. Check the Vercel/local environment variables.', true);
    setBusy(true); notify('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) notify(error.message.toLowerCase().includes('invalid login credentials') ? 'Incorrect email or password. Please try again.' : error.message, true);
    else notify('Signed in successfully.');
  }
  async function handleForgotPassword() {
    if (!email) return notify('Enter your email address first.', true);
    if (!supabase) return notify('Supabase is not configured.', true);
    setBusy(true); notify('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setBusy(false); notify(error ? error.message : 'Password reset link sent. Check your email inbox.', !!error);
  }
  async function updatePassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) return notify('Password must be at least 8 characters long.', true);
    setBusy(true); notify('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) notify(error.message, true);
    else { notify('Password updated successfully.'); setRecoveryMode(false); setNewPassword(''); window.history.replaceState({}, document.title, window.location.pathname); }
  }
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setMaterial(i, k, v) { setForm(p => ({ ...p, materials: p.materials.map((m, j) => i === j ? { ...m, [k]: v } : m) })); }

  function validate() {
    for (const [k, label] of [['dc_date','DC date'],['from_address','Dispatch address'],['to_address','Delivery address'],['receiver_name','Receiver name'],['receiver_phone','Receiver mobile']]) if (!clean(form[k])) return `${label} is required.`;
    const phone = /^\+?[\d\s()-]{7,20}$/;
    if (!phone.test(form.receiver_phone)) return 'Enter a valid receiver mobile number.';
    if (form.transport_mode === 'Own Vehicle') {
      for (const [k, label] of [['vehicle_number','Vehicle number'],['driver_name','Driver name'],['driver_phone','Driver mobile']]) if (!clean(form[k])) return `${label} is required for Own Vehicle mode.`;
      if (!phone.test(form.driver_phone)) return 'Enter a valid driver mobile number.';
    } else if (clean(form.driver_phone) && !phone.test(form.driver_phone)) return 'Enter a valid driver mobile number.';
    if (!form.materials.length) return 'Add at least one material.';
    for (let i = 0; i < form.materials.length; i++) {
      const m = form.materials[i];
      if (!clean(m.name)) return `Material ${i + 1}: description is required.`;
      if (!Number.isFinite(Number(m.qty)) || Number(m.qty) <= 0) return `Material ${i + 1}: quantity must be greater than zero.`;
      if (!clean(m.unit)) return `Material ${i + 1}: unit is required.`;
      if (m.rate !== '' && (!Number.isFinite(Number(m.rate)) || Number(m.rate) < 0)) return `Material ${i + 1}: rate must be zero or greater.`;
    }
    if (form.transport_mode === 'Other' && !clean(form.other_transport_mode)) return 'Enter the transport mode for Other.';
    return '';
  }
  async function nextNumber() {
    const prefix = `DC-${form.dc_date.replaceAll('-', '')}-`;
    const { data, error } = await supabase.from('delivery_challans').select('dc_number').like('dc_number', `${prefix}%`).order('dc_number', { ascending: false }).limit(1);
    if (error) throw error;
    return `${prefix}${String((Number(data?.[0]?.dc_number?.split('-').at(-1)) || 0) + 1).padStart(3, '0')}`;
  }
  async function createDC(e) {
    e.preventDefault();
    const problem = validate(); if (problem) return notify(problem, true);
    if (!supabase || !session) return notify('Connect Supabase and sign in before saving a shared DC.', true);
    setBusy(true); notify('');
    try {
      const dc_number = clean(form.dc_number) || await nextNumber();
      const row = { ...form, dc_number, approval_status: 'Pending', approved_by: null, approved_at: null,
        materials: form.materials.map(m => ({ ...m, name: clean(m.name), hsn: clean(m.hsn), qty: Number(m.qty), rate: m.rate === '' ? null : Number(m.rate), unit: clean(m.unit) })),
        created_by: session.user.id };
      const { data, error } = await supabase.from('delivery_challans').insert(row).select().single();
      if (error) throw error;
      setRecords(p => [data, ...p]); setPreview(data); setForm(blank); setActive('history');
      notify(`${data.dc_number} submitted for manager approval.`);
    } catch (err) { notify(err.message || 'Could not submit DC. Make sure the approval database migration is installed.', true); }
    finally { setBusy(false); }
  }
  async function decide(r, action) {
    if (!isManager) return notify('Only the designated manager can approve or reject DCs.', true);
    if (r.approval_status !== 'Pending') return notify('Only Pending DCs can be reviewed.', true);
    let reason = null;
    if (action === 'reject') { reason = window.prompt('Optional reason for rejection:'); if (reason === null) return; }
    setBusy(true); notify('');
    const fn = action === 'approve' ? 'approve_delivery_challan' : 'reject_delivery_challan';
    const args = action === 'approve' ? { p_id: r.id } : { p_id: r.id, p_reason: reason || null };
    const { data, error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) return notify(`Approval action failed: ${error.message}. Check that the Supabase approval SQL has been applied.`, true);
    await loadRecords();
    const updated = data && typeof data === 'object' ? data : null;
    if (updated) setPreview(updated);
    notify(action === 'approve' ? `${r.dc_number} approved.` : `${r.dc_number} rejected.`);
  }
  async function signOut() { await supabase.auth.signOut(); setRecords([]); setPreview(null); setRecoveryMode(false); }
  const filtered = useMemo(() => records.filter(r => {
    const hay = [r.dc_number, r.vehicle_number, r.receiver_name, r.driver_name, r.transport_mode, r.from_address, r.to_address, r.approval_status, ...(r.materials || []).map(m => m.name)].join(' ').toLowerCase();
    return (!search || hay.includes(search.toLowerCase())) && (!dateFilter || r.dc_date === dateFilter);
  }), [records, search, dateFilter]);
  const today = new Date().toISOString().slice(0, 10);

  async function loadPDFImage(path) {
    const loadImage = () =>
      new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d');
            if (!context || !image.naturalWidth || !image.naturalHeight) {
              reject(new Error(`Invalid image: ${path}`));
              return;
            }

            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (error) {
            reject(error);
          }
        };

        image.onerror = () => reject(new Error(`Could not load image: ${path}`));
        image.src = path;
      });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await loadImage();
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  async function downloadPDF(r) {
    if (r.approval_status !== 'Approved') return notify('PDF download is available only after manager approval.', true);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }), pageWidth = doc.internal.pageSize.getWidth(), margin = 12;
    const logoData = await loadPDFImage(LOGO_PATH).catch(() => null);
    const stampData = await loadPDFImage(STAMP_SIGNATURE_PATH).catch(() => null);
    const transport = r.transport_mode || (r.vehicle_number ? 'Own Vehicle' : 'Not specified');
    const materialRows = (r.materials || []).map((m, i) => {
      const qty = Number(m.qty) || 0, rate = Number(m.rate) || 0;
      return [i + 1, m.name || '', m.hsn || '', m.unit || '', qty, m.rate == null || m.rate === '' ? '' : `₹ ${money(rate)}`, m.rate == null || m.rate === '' ? '' : `₹ ${money(qty * rate)}`];
    });
    materialRows.push(['', 'NOT FOR SALE', '', '', '', '', '']);
    const total = (r.materials || []).reduce((sum, m) => sum + (Number(m.qty) || 0) * (Number(m.rate) || 0), 0);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(25,45,75);
    doc.text(COMPANY.name, margin, 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(55,65,75);
    doc.text(COMPANY.address1, margin, 18); 
    doc.text(COMPANY.address2, margin, 21.5); 
    doc.text(COMPANY.address3, margin, 25);
    doc.text(`${COMPANY.gst}  |  ${COMPANY.website}`, margin, 28.5);

    if (logoData) {
      doc.addImage(logoData, 'PNG', pageWidth - margin - 24, 5, 24, 24, undefined, 'FAST');
    }

    doc.setDrawColor(25,45,75); doc.setLineWidth(.4); doc.line(margin, 31, pageWidth - margin, 31);
    doc.setFillColor(249,207,178); doc.rect(margin, 32, pageWidth - margin * 2, 8, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(20,30,40); doc.text('DELIVERY CHALLAN', pageWidth/2, 37.5, { align:'center' });
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(`DC No.: ${r.dc_number || ''}`, margin+1, 46); doc.text(`Date: ${fmtDate(r.dc_date)}`, pageWidth-margin-1, 46, {align:'right'});
    
    autoTable(doc, { startY:49, head:[['SHIP FROM (DISPATCH ADDRESS)','SHIP TO (DELIVERY ADDRESS)']], body:[[r.from_address||'',r.to_address||'']], margin:{left:margin,right:margin}, styles:{fontSize:8,cellPadding:3,overflow:'linebreak',lineColor:[50,50,50],lineWidth:.2,minCellHeight:19}, headStyles:{fillColor:[180,197,225],textColor:[20,20,20],fontStyle:'bold'}, theme:'grid' });
    
    const details = [
      ['Purchase Order No.',r.purchase_order||'','Dispatch Doc No.',r.dispatch_doc_no||''],
      ['Mode/Terms of Payment',r.mode_of_payment||'','Other References',r.other_references||''],
      ['Transport Mode',transport==='Other'?(r.other_transport_mode||'Other'):transport,'Vehicle No.',r.vehicle_number||''],
      ['Driver Name',r.driver_name||'','Driver Mobile',r.driver_phone||''],
      ['Receiver Name',r.receiver_name||'','Receiver Mobile',r.receiver_phone||'']
    ];
    autoTable(doc,{startY:doc.lastAutoTable.finalY,body:details,margin:{left:margin,right:margin},styles:{fontSize:7.5,cellPadding:2.5,lineColor:[50,50,50],lineWidth:.2,overflow:'linebreak'},columnStyles:{0:{fontStyle:'bold',cellWidth:43},1:{cellWidth:48},2:{fontStyle:'bold',cellWidth:39},3:{cellWidth:'auto'}},theme:'grid'});
    
    autoTable(doc,{startY:doc.lastAutoTable.finalY+3,head:[['SL NO','Description of Goods','HSN/SAC','UNIT','Quantity','Rate (₹)','Amount (₹)']],body:materialRows,foot:[['','','','','','TOTAL',`₹ ${money(total)}`]],margin:{left:margin,right:margin,bottom:32},styles:{fontSize:7.5,cellPadding:2.2,lineColor:[50,50,50],lineWidth:.2,overflow:'linebreak'},headStyles:{fillColor:[180,197,225],textColor:[20,20,20],fontStyle:'bold'},footStyles:{fillColor:[250,226,211],textColor:[20,20,20],fontStyle:'bold'},columnStyles:{0:{cellWidth:12},1:{cellWidth:56},2:{cellWidth:20},3:{cellWidth:14},4:{cellWidth:17},5:{cellWidth:27},6:{cellWidth:'auto'}},theme:'grid',
      didParseCell: d => { if (d.section === 'body' && d.row.index === materialRows.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = [130,35,35]; } }});
    
    let y = doc.lastAutoTable.finalY + 6;
    if (r.terms_of_delivery) { 
      if (y > 245) { doc.addPage(); y = 18; } 
      doc.setFont('helvetica','normal'); doc.setFontSize(8); 
      const terms = doc.splitTextToSize(`Terms of Delivery: ${r.terms_of_delivery}`, pageWidth-margin*2); 
      doc.text(terms, margin, y); 
      y += terms.length * 4 + 8; 
    }
    
    if (y > 240) { doc.addPage(); y = 20; }
    
    const stampWidth = 45;
    const stampHeight = 22;
    const stampX = pageWidth - margin - stampWidth;
    
    if (stampData) {
      doc.addImage(stampData, 'PNG', stampX, y, stampWidth, stampHeight, undefined, 'FAST');
    }
    
    doc.setFont('helvetica','bold'); 
    doc.setFontSize(8.5); 
    doc.setTextColor(20,20,20);
    doc.text('Authorised Signature', pageWidth - margin, y + stampHeight + 6, { align: 'right' });

    doc.save(`${(r.dc_number||'delivery-challan').replace(/[^a-z0-9-_]/gi,'_')}.pdf`);
  }

  function viewDC(r) { setPreview(r); setActive('history'); }

  if (!authReady) return <main className="shell"><p>Loading portal…</p></main>;
  if (!session || recoveryMode) return <main className="shell auth"><div className="auth-container"><div className="auth-left">
    <header className="brand" style={{marginBottom:20}}><div className="logo"><img src={LOGO_PATH} alt="AtomPlus logo" /></div><div><h1 style={{fontSize:'1.4rem'}}>Delivery Challan Portal</h1><p style={{fontSize:'.85rem'}}>Team access • Searchable history</p></div></header>
    {recoveryMode ? <form className="authform" onSubmit={updatePassword}><h2>Reset Password</h2><p className="muted">Enter your new secure password below.</p><label>New Password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showPassword?'text':'password'} minLength="8" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required autoComplete="new-password" style={{width:'100%',paddingRight:60}}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div></label><button className="primary full" disabled={busy}>{busy?'Updating…':'Update Password'}</button>{message&&<p className={isError?'error':'success'}>{message}</p>}</form>
    : <form className="authform" onSubmit={authSubmit}><h2>Welcome back</h2><p className="muted">Sign in to access your team's shared challans.</p><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label style={{marginTop:12}}>Password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showPassword?'text':'password'} minLength="8" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" style={{width:'100%',paddingRight:60}}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div></label>{message&&<p className={isError?'error':'success'}>{message}</p>}<div style={{textAlign:'right',marginTop:6}}><button type="button" className="linkbtn" onClick={handleForgotPassword}>Forgot password?</button></div><button className="primary full" disabled={busy}>{busy?'Please wait…':'Sign in'}</button></form>}
  </div><div className="auth-right"><div className="auth-right-content"><TruckGraphic/><h3>Track & Manage Deliveries</h3></div></div></div></main>;

  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo"><img src={LOGO_PATH} alt="AtomPlus logo" /></div><div><h1>AtomPlus Delivery Challan</h1><p>Management Portal</p></div></div><div className="account"><span>{session.user.email}</span>{isManager&&<strong>Manager</strong>}<button onClick={signOut}>Sign out</button></div></header>
    <nav className="tabs"><button className={active==='dashboard'?'selected':''} onClick={()=>setActive('dashboard')}>Dashboard</button><button className={active==='create'?'selected':''} onClick={()=>setActive('create')}>+ New DC</button><button className={active==='history'?'selected':''} onClick={()=>setActive('history')}>DC History</button></nav>
    {message&&<div className={isError?'alert error':'alert success'}>{message}<button onClick={()=>setMessage('')} aria-label="Dismiss">×</button></div>}
    {active==='dashboard'&&<><div className="pagehead"><div><h2>Dashboard</h2><p>Overview of your team's delivery challans.</p></div><button className="primary" onClick={()=>{setForm(blank());setActive('create');}}>+ Create DC</button></div><div className="stats"><div className="stat"><span>Total challans loaded</span><strong>{records.length}</strong></div><div className="stat"><span>Today's challans</span><strong>{records.filter(r=>r.dc_date===today).length}</strong></div><div className="stat"><span>Vehicles used</span><strong>{new Set(records.map(r=>r.vehicle_number).filter(Boolean)).size}</strong></div></div><section className="card"><div className="sectionhead"><h3>Recent challans</h3><button onClick={()=>setActive('history')}>View history →</button></div><RecordTable records={records.slice(0,6)} onView={viewDC} onPDF={downloadPDF} isManager={isManager} onDecide={decide}/></section></>}
    {active==='create'&&<><div className="pagehead"><div><h2>Create delivery challan</h2><p>Complete the details, then submit for manager approval.</p></div></div><form className="card dcform" onSubmit={createDC}>
      <h3>Challan details</h3><div className="formgrid"><Field label="DC date" required><input type="date" value={form.dc_date} onChange={e=>setField('dc_date',e.target.value)} required/></Field><Field label="DC number" hint="Leave blank to suggest a number"><input value={form.dc_number} onChange={e=>setField('dc_number',e.target.value)} placeholder="Auto-suggested on save"/></Field><Field label="Dispatch from address" required><textarea value={form.from_address} onChange={e=>setField('from_address',e.target.value)} rows="3" required placeholder="Company, street, city, PIN"/></Field><Field label="Delivery to address" required><textarea value={form.to_address} onChange={e=>setField('to_address',e.target.value)} rows="3" required placeholder="Company, street, city, PIN"/></Field></div>
      <div className="sectionhead"><h3>Material list</h3><button type="button" onClick={()=>setForm(p=>({...p,materials:[...p.materials,{name:'',hsn:'',qty:'',unit:'Nos',rate:''}]}))}>+ Add material</button></div>
      {form.materials.map((m,i)=><div className="materialrow materialrow-extended" key={i}><Field label={`Material ${i+1}`} required><input value={m.name} onChange={e=>setMaterial(i,'name',e.target.value)} required placeholder="Description of goods"/></Field><Field label="HSN/SAC"><input value={m.hsn||''} onChange={e=>setMaterial(i,'hsn',e.target.value)} placeholder="Optional"/></Field><Field label="Quantity" required><input type="number" min=".001" step="any" value={m.qty} onChange={e=>setMaterial(i,'qty',e.target.value)} required placeholder="0"/></Field><Field label="Unit" required><select value={m.unit} onChange={e=>setMaterial(i,'unit',e.target.value)}>{['Nos','Kg','Ton','Meters','Boxes','Litres','Other'].map(u=><option key={u}>{u}</option>)}</select></Field><Field label="Rate (₹)"><input type="number" min="0" step=".01" value={m.rate??''} onChange={e=>setMaterial(i,'rate',e.target.value)} placeholder="Optional"/></Field><Field label="Amount (₹)"><input value={m.rate!==''&&m.rate!=null&&m.qty?money(Number(m.qty)*Number(m.rate)):''} readOnly placeholder="Auto"/></Field>{form.materials.length>1&&<button type="button" className="remove" onClick={()=>setForm(p=>({...p,materials:p.materials.filter((_,j)=>j!==i)}))}>Remove</button>}</div>)}
      <h3 className="subhead">Transport details</h3><div className="formgrid"><Field label="Transport Mode" required><select value={form.transport_mode} onChange={e=>setField('transport_mode',e.target.value)} required><option>Own Vehicle</option><option>VRL Logistics</option><option>DTDC</option><option>Other</option></select></Field>{form.transport_mode==='Other'&&<Field label="Other transport mode" required><input value={form.other_transport_mode} onChange={e=>setField('other_transport_mode',e.target.value)} required/></Field>}<Field label="Vehicle number" required={form.transport_mode==='Own Vehicle'}><input value={form.vehicle_number} onChange={e=>setField('vehicle_number',e.target.value.toUpperCase())} required={form.transport_mode==='Own Vehicle'}/></Field><Field label="Driver name" required={form.transport_mode==='Own Vehicle'}><input value={form.driver_name} onChange={e=>setField('driver_name',e.target.value)} required={form.transport_mode==='Own Vehicle'}/></Field><Field label="Driver mobile number" required={form.transport_mode==='Own Vehicle'}><input type="tel" value={form.driver_phone} onChange={e=>setField('driver_phone',e.target.value)} required={form.transport_mode==='Own Vehicle'}/></Field><Field label="Purchase Order Number"><input value={form.purchase_order} onChange={e=>setField('purchase_order',e.target.value)}/></Field><Field label="Dispatch Document Number"><input value={form.dispatch_doc_no} onChange={e=>setField('dispatch_doc_no',e.target.value)}/></Field><Field label="Mode / Terms of Payment"><input value={form.mode_of_payment} onChange={e=>setField('mode_of_payment',e.target.value)}/></Field><Field label="Other References"><input value={form.other_references} onChange={e=>setField('other_references',e.target.value)}/></Field><Field label="Terms of Delivery"><textarea rows="2" value={form.terms_of_delivery} onChange={e=>setField('terms_of_delivery',e.target.value)}/></Field></div>
      <h3 className="subhead">Receiver details</h3><div className="formgrid"><Field label="Receiver name" required><input value={form.receiver_name} onChange={e=>setField('receiver_name',e.target.value)} required/></Field><Field label="Receiver mobile number" required><input type="tel" value={form.receiver_phone} onChange={e=>setField('receiver_phone',e.target.value)} required placeholder="Mobile number"/></Field></div><div className="formactions"><button type="button" onClick={()=>setForm(blank())}>Clear form</button><button className="primary" disabled={busy}>{busy?'Submitting…':'Submit for approval'}</button></div>
    </form></>}
    {active==='history'&&<><div className="pagehead"><div><h2>DC history</h2><p>Search saved records shared across authorized users.</p></div><button className="primary" onClick={()=>{setForm(blank());setActive('create');}}>+ New DC</button></div><section className="card"><div className="filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search DC, vehicle, receiver, material…"/><input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} aria-label="Filter by date"/><button onClick={()=>{setSearch('');setDateFilter('');}}>Clear filters</button><button onClick={loadRecords} disabled={busy}>{busy?'Loading…':'Refresh'}</button></div><p className="muted">{filtered.length} matching record(s), up to 1,000 latest records loaded.</p><RecordTable records={filtered} onView={viewDC} onPDF={downloadPDF} isManager={isManager} onDecide={decide}/></section>
      {preview&&<section className="card preview"><div className="sectionhead"><div><h3>DC preview · {preview.dc_number}</h3><p className="muted">{fmtDate(preview.dc_date)} · Status: <b>{preview.approval_status||'Pending'}</b></p></div><div className="buttonrow">{preview.approval_status==='Approved'&&<button onClick={()=>downloadPDF(preview)} className="primary">Download PDF</button>}{isManager&&preview.approval_status==='Pending'&&<><button className="primary" onClick={()=>decide(preview,'approve')}>Approve</button><button onClick={()=>decide(preview,'reject')}>Reject</button></>}<button onClick={()=>setPreview(null)}>Close</button></div></div><ChallanPreview record={preview}/></section>}
    </>}
    <footer>Shared records require a configured Supabase project and an authenticated account.</footer>
  </main>;
}

function Field({label,required,hint,children}) { return <label className="field"><span>{label}{required&&<b className="required"> *</b>}</span>{children}{hint&&<small>{hint}</small>}</label>; }

function RecordTable({records,onView,onPDF,isManager,onDecide}) {
  if(!records.length) return <div className="empty"><strong>No challans found</strong><p>Create a DC or adjust your search filters.</p></div>;
  return <div className="tablewrap"><table><thead><tr><th>DC number</th><th>Date</th><th>Vehicle</th><th>Receiver</th><th>Materials</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td><strong>{r.dc_number}</strong></td><td>{fmtDate(r.dc_date)}</td><td>{r.vehicle_number||r.transport_mode||'—'}</td><td>{r.receiver_name}</td><td>{(r.materials||[]).length} item(s)</td><td>{r.approval_status||'Pending'}</td><td><div className="buttonrow"><button onClick={()=>onView(r)}>View</button>{r.approval_status==='Approved'&&<button onClick={()=>onPDF(r)}>PDF</button>}{isManager&&r.approval_status==='Pending'&&<><button onClick={()=>onDecide(r,'approve')} disabled={false}>Approve</button><button onClick={()=>onDecide(r,'reject')}>Reject</button></>}</div></td></tr>)}</tbody></table></div>;
}

function ChallanPreview({record:r}) {
  const total=(r.materials||[]).reduce((sum,m)=>sum+(Number(m.qty)||0)*(Number(m.rate)||0),0);
  const transport=r.transport_mode==='Other'?(r.other_transport_mode||'Other'):(r.transport_mode||(r.vehicle_number?'Own Vehicle':'Not specified'));
  return <div className="paper atomplus-paper"><div className="company-header"><div className="company-mark"><img src={LOGO_PATH} alt="AtomPlus logo" /></div><div><h2>{COMPANY.name}</h2><p>{COMPANY.address1} {COMPANY.address2} {COMPANY.address3}</p><p>{COMPANY.gst} · {COMPANY.website}</p></div></div><h2 className="challan-title">DELIVERY CHALLAN</h2><div className="paperline"><b>DC Number:</b> {r.dc_number}<b>Date:</b> {fmtDate(r.dc_date)}</div><div className="addressgrid"><div><b>SHIP FROM</b><p>{r.from_address}</p></div><div><b>SHIP TO</b><p>{r.to_address}</p></div></div><div className="paperdetails"><p><b>Purchase Order No.:</b> {r.purchase_order||'—'}</p><p><b>Dispatch Doc No.:</b> {r.dispatch_doc_no||'—'}</p><p><b>Mode/Terms of Payment:</b> {r.mode_of_payment||'—'}</p><p><b>Other References:</b> {r.other_references||'—'}</p><p><b>Transport Mode:</b> {transport}</p>{r.vehicle_number&&<p><b>Vehicle No.:</b> {r.vehicle_number}</p>}{r.driver_name&&<p><b>Driver Name:</b> {r.driver_name}</p>}{r.driver_phone&&<p><b>Driver Mobile:</b> {r.driver_phone}</p>}<p><b>Receiver:</b> {r.receiver_name||'—'} {r.receiver_phone?`· ${r.receiver_phone}`:''}</p></div><h4>DESCRIPTION OF GOODS</h4><table><thead><tr><th>SL NO</th><th>Description of Goods</th><th>HSN/SAC</th><th>Unit</th><th>Quantity</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead><tbody>{(r.materials||[]).map((m,i)=><tr key={i}><td>{i+1}</td><td>{m.name}</td><td>{m.hsn||''}</td><td>{m.unit}</td><td>{m.qty}</td><td>{m.rate==null||m.rate===''?'':money(m.rate)}</td><td>{m.rate==null||m.rate===''?'':money(Number(m.qty)*Number(m.rate))}</td></tr>)}<tr className="not-for-sale-row"><td></td><td><b>NOT FOR SALE</b></td><td></td><td></td><td></td><td></td><td></td></tr></tbody><tfoot><tr><td colSpan="6"><b>TOTAL</b></td><td><b>₹ {money(total)}</b></td></tr></tfoot></table>{r.terms_of_delivery&&<p className="delivery-terms"><b>Terms of Delivery:</b> {r.terms_of_delivery}</p>}
  {r.approval_status === 'Approved' && (
    <div className="stamp-signature-preview" style={{display:'flex',flexDirection:'column',alignItems:'flex-end',marginTop:24}}>
      <img
        src={STAMP_SIGNATURE_PATH}
        alt="Company stamp and signature"
        style={{ maxWidth: '200px', height: 'auto', objectFit: 'contain' }}
      />
      <div style={{fontWeight:'bold',fontSize:'13px',color:'#222',marginTop:4,marginRight:10}}>
        Authorised Signature
      </div>
    </div>
  )}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
