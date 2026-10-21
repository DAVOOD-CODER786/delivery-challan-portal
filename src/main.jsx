import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key && !url.includes('YOUR_PROJECT') ? createClient(url, key) : null;

const blank = () => ({
  dc_date: new Date().toISOString().slice(0, 10),
  dc_number: '',
  purchase_order_no: 'PO-12345',
  dispatch_doc_no: 'TRANSFER',
  transport_mode: 'VRL LOGISTICS',
  vehicle_number: '-',
  lr_number: '-',
  mode_of_payment: 'Online / Bank Transfer',
  terms_of_delivery: 'Our own materials moved from one site to another.',
  other_references: '-',
  ship_from_company: 'AtomPlus Technologies Private Limited',
  ship_from_address: 'No. D-1902, 19th Floor, Tower D,\nShriram Greenfields, Bommanahalli Village,\nBangalore - Karnataka 560049, India.',
  ship_from_phone: '+91 80 0000 0000',
  ship_to_company: 'ABC Enterprises',
  ship_to_address: 'Plot No. 45, Industrial Area,\nSolapur - 413001, Maharashtra, India',
  ship_to_contact: 'Mr. Ramesh Patil - 9876543210',
  materials: [
    { name: 'SS 304 Flexible Hose pipe-2" (1500 mm)', hsn: '83071000', qty: 2, unit: 'Nos', rate: 3500 },
    { name: 'SS 304 Elbow 90°', hsn: '73079200', qty: 5, unit: 'Nos', rate: 450 },
    { name: 'SS 304 Tee Connector', hsn: '73079300', qty: 3, unit: 'Nos', rate: 380 },
    { name: 'SS 304 Clamp', hsn: '83071000', qty: 10, unit: 'Nos', rate: 120 }
  ]
});

const fmtDate = s => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN') : '';
const clean = v => String(v ?? '').trim();

function TruckGraphic() {
  return (
    <svg className="truck-graphic" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 220V150H90V220H130V120H170V220H230V100H280V220H340V140H380V220H450V220Z" fill="#0d593b" opacity="0.5"/>
      <path d="M-20 280 C 150 280, 200 180, 520 180" stroke="#ffffff" strokeWidth="36" opacity="0.2" strokeLinecap="round"/>
      <path d="M-20 280 C 150 280, 200 180, 520 180" stroke="#ffffff" strokeWidth="2" strokeDasharray="12 12" opacity="0.6"/>
      <g fill="#E5C158">
        <path d="M120 160 C120 150, 135 135, 135 120 C135 110, 128 100, 120 100 C112 100, 105 110, 105 120 C105 135, 120 150, 120 160 Z"/>
        <circle cx="120" cy="120" r="5" fill="#0b4d33"/>
        <path d="M380 130 C380 120, 395 105, 395 90 C395 80, 388 70, 380 70 C372 70, 365 80, 365 90 C365 105, 380 120, 380 130 Z"/>
        <circle cx="380" cy="90" r="5" fill="#0b4d33"/>
        <path d="M260 250 C260 240, 275 225, 275 210 C275 200, 268 190, 260 190 C252 190, 245 200, 245 210 C245 225, 260 240, 260 250 Z"/>
        <circle cx="260" cy="210" r="5" fill="#0b4d33"/>
      </g>
      <g transform="translate(160, 185)">
        <rect x="0" y="0" width="130" height="70" rx="6" fill="#FFFFFF" />
        <rect x="10" y="10" width="110" height="50" rx="3" fill="#E8EFEC" />
        <rect x="45" y="20" width="30" height="30" rx="6" fill="#0b4d33" />
        <text x="60" y="40" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">DC</text>
        <path d="M130 20 H160 L180 45 V70 H130 Z" fill="#2E7D5B" />
        <path d="M142 26 H158 L170 42 H142 Z" fill="#A3D9C9" />
        <circle cx="30" cy="72" r="16" fill="#1F2923" />
        <circle cx="30" cy="72" r="7" fill="#E8EFEC" />
        <circle cx="100" cy="72" r="16" fill="#1F2923" />
        <circle cx="100" cy="72" r="7" fill="#E8EFEC" />
        <circle cx="155" cy="72" r="16" fill="#1F2923" />
        <circle cx="155" cy="72" r="7" fill="#E8EFEC" />
        <path d="M180 52 H184 V60 H180 Z" fill="#E5C158" />
      </g>
    </svg>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [form, setForm] = useState(blank);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [active, setActive] = useState('dashboard');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const notify = (msg, error = false) => { setMessage(msg); setIsError(error); };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const isRecoveryLink = hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery';

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setNewPassword('');
        setPassword('');
        setMessage('');
      }
      setAuthReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setMessage(error.message);
        setIsError(true);
      }
      setSession(data.session);
      if (isRecoveryLink && data.session) {
        setRecoveryMode(true);
      }
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => { if (session && supabase && !recoveryMode) loadRecords(); }, [session, recoveryMode]);

  async function loadRecords() {
    setBusy(true);
    const { data, error } = await supabase.from('delivery_challans').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) notify(error.message, true); else setRecords(data || []);
    setBusy(false);
  }

  async function authSubmit(e) {
    e.preventDefault(); 
    setBusy(true); 
    notify('');
    
    const result = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
      
    setBusy(false);
    
    if (result.error) {
      const errMsg = result.error.message.toLowerCase().includes('invalid login credentials')
        ? 'Incorrect password or email. Please try again.'
        : result.error.message;
      notify(errMsg, true);
    } else if (authMode === 'signup' && !result.data.session) {
      notify('Account created. Check your email to confirm the account before signing in.');
    } else {
      notify(authMode === 'signin' ? 'Signed in successfully.' : 'Account created and signed in.');
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      notify('Please enter your email address above first.', true);
      return;
    }
    setBusy(true);
    notify('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) {
      notify(error.message, true);
    } else {
      notify('Password reset link sent! Check your email inbox.');
    }
  }

  async function updatePassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      notify('Password must be at least 8 characters long.', true);
      return;
    }
    setBusy(true);
    notify('');
    await supabase.auth.getSession();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      notify(error.message, true);
    } else {
      notify('Password updated successfully! You can now sign in.');
      setRecoveryMode(false);
      setNewPassword('');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setMaterial(i, k, v) { setForm(p => ({ ...p, materials: p.materials.map((m, j) => i === j ? { ...m, [k]: v } : m) })); }

  function validate() {
    if (!clean(form.ship_from_address)) return 'Dispatch address is required.';
    if (!clean(form.ship_to_address)) return 'Delivery address is required.';
    if (!form.materials.length) return 'Add at least one material.';
    for (let i = 0; i < form.materials.length; i++) {
      const m = form.materials[i];
      if (!clean(m.name)) return `Material ${i + 1}: name is required.`;
      if (!Number.isFinite(Number(m.qty)) || Number(m.qty) <= 0) return `Material ${i + 1}: quantity must be greater than zero.`;
      if (!Number.isFinite(Number(m.rate)) || Number(m.rate) < 0) return `Material ${i + 1}: rate must be valid.`;
      if (!clean(m.unit)) return `Material ${i + 1}: unit is required.`;
    }
    return '';
  }

  async function createDC(e) {
    e.preventDefault();
    const problem = validate(); if (problem) return notify(problem, true);
    if (!supabase || !session) return notify('Connect Supabase and sign in before saving a shared DC.', true);
    setBusy(true); notify('');
    try {
      const dc_number = clean(form.dc_number) || await nextNumber();
      const row = { 
        ...form, 
        dc_number, 
        from_address: form.ship_from_address,
        to_address: form.ship_to_address,
        materials: form.materials.map(m => ({ ...m, name: clean(m.name), qty: Number(m.qty), rate: Number(m.rate), unit: clean(m.unit) })), 
        created_by: session.user.id 
      };
      const { data, error } = await supabase.from('delivery_challans').insert(row).select().single();
      if (error) throw error;
      setRecords(p => [data, ...p]); setPreview(data); setForm(blank()); setActive('history');
      notify(`Saved ${data.dc_number}. It is now available to signed-in portal users.`);
    } catch (err) { notify(err.message || 'Could not save DC.', true); }
    finally { setBusy(false); }
  }

  async function nextNumber() {
    const prefix = `DC-${form.dc_date.replaceAll('-', '')}-`;
    const { data, error } = await supabase.from('delivery_challans').select('dc_number').like('dc_number', `${prefix}%`).order('dc_number', { ascending: false }).limit(1);
    if (error) throw error;
    const last = data?.[0]?.dc_number || '';
    const n = Number(last.split('-').at(-1)) || 0;
    return `${prefix}${String(n + 1).padStart(3, '0')}`;
  }

  async function signOut() { 
    await supabase.auth.signOut(); 
    setRecords([]); 
    setPreview(null); 
    setRecoveryMode(false);
  }

  const filtered = useMemo(() => records.filter(r => {
    const hay = [r.dc_number, r.vehicle_number, r.ship_to_company, r.ship_from_company, r.ship_from_address, r.ship_to_address, ...(r.materials || []).map(m => m.name)].join(' ').toLowerCase();
    return (!search || hay.includes(search.toLowerCase())) && (!dateFilter || r.dc_date === dateFilter);
  }), [records, search, dateFilter]);

  const today = new Date().toISOString().slice(0, 10);

  function calculateTotal(items) {
    return (items || []).reduce((acc, item) => acc + (Number(item.qty || item.quantity || 0) * Number(item.rate || 0)), 0);
  }

  function downloadPDF(r) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    
    // Header
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0, 51, 102);
    doc.text('AtomPlus Technologies Private Limited', 14, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('https://atomplus.in', 14, 20);
    doc.text('Registered Office: No. D-1902, 19th Floor, Tower D, Shriram Greenfields, Bommanahalli Village, Bangalore - Karnataka 560049, India.', 14, 24);
    doc.text('CIN: U40106KA2022PTC165701', 14, 28);
    
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 51, 102);
    doc.text('Innovative Solutions', 196, 16, { align: 'right' });
    doc.text('for a Better Tomorrow', 196, 21, { align: 'right' });

    doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // Title Bar
    doc.setFillColor(0, 51, 102);
    doc.rect(14, 35, 182, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('DELIVERY CHALLAN', 105, 40, { align: 'center' });

    // Meta Info Table
    autoTable(doc, {
      startY: 44,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 51, 102] },
      headStyles: { fillColor: [230, 240, 250], textColor: [0, 51, 102], fontStyle: 'bold' },
      body: [
        [
          { content: 'Ship From (Dispatch Address)\n\n' + (r.ship_from_company || 'AtomPlus Technologies Private Limited') + '\n' + (r.ship_from_address || r.from_address || ''), styles: { cellWidth: 70 } },
          { content: 'DC No.: ' + (r.dc_number || '') + '\n\nPurchase Order No.: ' + (r.purchase_order_no || '-') + '\n\nDispatch Doc No.: ' + (r.dispatch_doc_no || 'TRANSFER') + '\n\nBill of Lading / LR-RR No.: ' + (r.lr_number || '-'), styles: { cellWidth: 56 } },
          { content: 'Date: ' + fmtDate(r.dc_date) + '\n\nTerms of Delivery:\n' + (r.terms_of_delivery || 'Our own materials moved from one site to another.') + '\n\nTransport Mode: ' + (r.transport_mode || 'VRL LOGISTICS') + '\n\nVehicle No.: ' + (r.vehicle_number || '-'), styles: { cellWidth: 56 } }
        ]
      ]
    });

    // Items Table
    const itemsBody = (r.materials || []).map((m, i) => [
      i + 1,
      m.name,
      m.hsn || '83071000',
      m.unit || 'Nos',
      m.qty || m.quantity || 0,
      `₹ ${(Number(m.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `₹ ${(Number(m.qty || m.quantity || 0) * Number(m.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    itemsBody.push([
      { content: 'TOTAL', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `₹ ${calculateTotal(r.materials).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      theme: 'grid',
      head: [['SNO', 'Description of Goods', 'HSN/SAC', 'UNIT', 'Quantity', 'Rate', 'Amount']],
      body: itemsBody,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 51, 102], textColor: [0, 0, 0] },
      headStyles: { fillColor: [210, 225, 245], textColor: [0, 51, 102], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 25 }, 3: { halign: 'center', cellWidth: 15 }, 4: { halign: 'center', cellWidth: 18 }, 5: { halign: 'right', cellWidth: 25 }, 6: { halign: 'right', cellWidth: 27 } }
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFillColor(255, 229, 153);
    doc.rect(14, finalY, 182, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 51, 102);
    doc.text(r.terms_of_delivery || 'Our own materials moved from one site to another.', 105, finalY + 4, { align: 'center' });

    // Signature Block
    const sigY = finalY + 25;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('This is a computer-generated delivery challan.', 14, sigY);
    doc.setDrawColor(0, 51, 102); doc.line(140, sigY - 4, 196, sigY - 4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 51, 102);
    doc.text('Authorised Signature', 168, sigY, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text('For AtomPlus Technologies Pvt. Ltd.', 168, sigY + 4, { align: 'center' });

    doc.save(`${r.dc_number.replace(/[^a-z0-9-_]/gi, '_')}.pdf`);
  }

  function viewDC(r) { setPreview(r); setActive('history'); }

  if (!authReady) return <main className="shell"><p>Loading portal…</p></main>;

  if (!session || recoveryMode) {
    return (
      <main className="shell auth">
        <div className="auth-container">
          <div className="auth-left">
            <header className="brand" style={{ marginBottom: '20px' }}>
              <div className="logo">A+</div>
              <div>
                <h1 style={{ fontSize: '1.4rem' }}>AtomPlus Challan Portal</h1>
                <p style={{ fontSize: '0.85rem' }}>Team access • Searchable history</p>
              </div>
            </header>

            {recoveryMode ? (
              <form onSubmit={updatePassword}>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>Reset Password</h2>
                <p className="muted" style={{ marginBottom: '20px' }}>Enter your new secure password below.</p>
                <label>
                  New Password
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      minLength="8" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      required 
                      autoComplete="new-password"
                      style={{ width: '100%', paddingRight: '60px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#003366', fontWeight: 'bold' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
                <button className="primary full" disabled={busy} style={{ marginTop: '15px' }}>
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
                {message && <p className={isError ? 'error' : 'success'} style={{ marginTop: '15px' }}>{message}</p>}
              </form>
            ) : (
              <form onSubmit={authSubmit}>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
                  {authMode === 'signin' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="muted" style={{ marginBottom: '20px' }}>
                  Sign in to access your team's shared challans.
                </p>

                <label>
                  Email address
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    autoComplete="email"
                  />
                </label>

                <label style={{ marginTop: '12px' }}>
                  Password
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      minLength="8" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      style={{ width: '100%', paddingRight: '60px', borderColor: isError ? '#e53e3e' : undefined }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#003366', fontWeight: 'bold' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                {message && isError && (
                  <p style={{ color: '#e53e3e', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px', marginBottom: '8px' }}>
                    {message}
                  </p>
                )}

                {authMode === 'signin' && (
                  <div style={{ textAlign: 'right', marginTop: '6px', marginBottom: '16px' }}>
                    <button 
                      type="button" 
                      className="linkbtn" 
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button className="primary full" disabled={busy} style={{ marginTop: '10px' }}>
                  {busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
                
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                  <button 
                    type="button" 
                    className="linkbtn" 
                    onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); notify(''); }}
                  >
                    {authMode === 'signin' ? "Need an account? Sign up" : "Already registered? Sign in"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="auth-right">
            <div className="auth-right-content">
              <TruckGraphic />
              <h3 style={{ marginTop: '15px', fontWeight: '500', opacity: 0.9 }}>
                Track & Manage Deliveries
              </h3>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">A+</div>
          <div><h1>AtomPlus Portal</h1><p>Delivery Challan System</p></div>
        </div>
        <div className="account">
          <span>{session.user.email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={active === 'dashboard' ? 'selected' : ''} onClick={() => setActive('dashboard')}>Dashboard</button>
        <button className={active === 'create' ? 'selected' : ''} onClick={() => setActive('create')}>+ New DC</button>
        <button className={active === 'history' ? 'selected' : ''} onClick={() => setActive('history')}>DC History</button>
      </nav>

      {message && <div className={isError ? 'alert error' : 'alert success'}>{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}

      {active === 'dashboard' && (
        <>
          <div className="pagehead">
            <div><h2>Dashboard</h2><p>Overview of your team's delivery challans.</p></div>
            <button className="primary" onClick={() => { setForm(blank()); setActive('create'); }}>+ Create DC</button>
          </div>
          <div className="stats">
            <div className="stat"><span>Total challans loaded</span><strong>{records.length}</strong></div>
            <div className="stat"><span>Today's challans</span><strong>{records.filter(r => r.dc_date === today).length}</strong></div>
            <div className="stat"><span>Vehicles used</span><strong>{new Set(records.map(r => r.vehicle_number)).size}</strong></div>
          </div>
          <section className="card">
            <div className="sectionhead">
              <h3>Recent challans</h3>
              <button onClick={() => setActive('history')}>View history →</button>
            </div>
            <RecordTable records={records.slice(0, 6)} onView={viewDC} onPDF={downloadPDF} />
          </section>
        </>
      )}

      {active === 'create' && (
        <>
          <div className="pagehead"><div><h2>Create delivery challan</h2><p>Complete the details with HSN codes, pricing, and transport mode.</p></div></div>
          <form className="card dcform" onSubmit={createDC}>
            <h3>Challan details</h3>
            <div className="formgrid">
              <Field label="DC date" required><input type="date" value={form.dc_date} onChange={e => setField('dc_date', e.target.value)} required /></Field>
              <Field label="DC number" hint="Leave blank to suggest a number"><input value={form.dc_number} onChange={e => setField('dc_number', e.target.value)} placeholder="Auto-suggested on save" /></Field>
              <Field label="Purchase order No"><input value={form.purchase_order_no} onChange={e => setField('purchase_order_no', e.target.value)} /></Field>
              <Field label="Dispatch doc No"><input value={form.dispatch_doc_no} onChange={e => setField('dispatch_doc_no', e.target.value)} /></Field>
              <Field label="Transport Mode">
                <select value={form.transport_mode} onChange={e => setField('transport_mode', e.target.value)}>
                  {['VRL LOGISTICS', 'DTDC', 'OWN VEHICLE', 'BLUE DART'].map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Vehicle number"><input value={form.vehicle_number} onChange={e => setField('vehicle_number', e.target.value.toUpperCase())} /></Field>
              <Field label="Bill of lading / LR-RR No"><input value={form.lr_number} onChange={e => setField('lr_number', e.target.value)} /></Field>
              <Field label="Terms of delivery"><input value={form.terms_of_delivery} onChange={e => setField('terms_of_delivery', e.target.value)} /></Field>
              <Field label="Dispatch from address" required><textarea value={form.ship_from_address} onChange={e => setField('ship_from_address', e.target.value)} rows="3" required /></Field>
              <Field label="Delivery to address" required><textarea value={form.ship_to_address} onChange={e => setField('ship_to_address', e.target.value)} rows="3" required /></Field>
            </div>

            <div className="sectionhead">
              <h3>Material list & pricing</h3>
              <button type="button" onClick={() => setForm(p => ({ ...p, materials: [...p.materials, { name: '', hsn: '83071000', qty: 1, unit: 'Nos', rate: 0 }] }))}>+ Add material</button>
            </div>
            {form.materials.map((m, i) => (
              <div className="materialrow" key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
                <Field label={`Material ${i + 1}`} required><input value={m.name} onChange={e => setMaterial(i, 'name', e.target.value)} required placeholder="Material name" /></Field>
                <Field label="HSN/SAC"><input value={m.hsn} onChange={e => setMaterial(i, 'hsn', e.target.value)} placeholder="HSN code" /></Field>
                <Field label="Quantity" required><input type="number" min="0.001" step="any" value={m.qty} onChange={e => setMaterial(i, 'qty', e.target.value)} required /></Field>
                <Field label="Unit" required>
                  <select value={m.unit} onChange={e => setMaterial(i, 'unit', e.target.value)}>
                    {['Nos', 'Kg', 'Ton', 'Meters', 'Boxes', 'Litres', 'Other'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Rate (₹)" required><input type="number" min="0" step="any" value={m.rate} onChange={e => setMaterial(i, 'rate', e.target.value)} required /></Field>
                {form.materials.length > 1 && <button type="button" className="remove" onClick={() => setForm(p => ({ ...p, materials: p.materials.filter((_, j) => j !== i) }))}>Remove</button>}
              </div>
            ))}

            <div className="formactions" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setForm(blank())}>Clear form</button>
              <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Validate & Save DC'}</button>
            </div>
          </form>
        </>
      )}

      {active === 'history' && (
        <>
          <div className="pagehead">
            <div><h2>DC history</h2><p>Search saved records shared across authorized users.</p></div>
            <button className="primary" onClick={() => { setForm(blank()); setActive('create'); }}>+ New DC</button>
          </div>
          <section className="card">
            <div className="filters">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search DC, vehicle, material…" />
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} aria-label="Filter by date" />
              <button onClick={() => { setSearch(''); setDateFilter(''); }}>Clear filters</button>
              <button onClick={loadRecords} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
            </div>
            <p className="muted">{filtered.length} matching record(s), up to 1,000 latest records loaded.</p>
            <RecordTable records={filtered} onView={viewDC} onPDF={downloadPDF} />
          </section>
          {preview && (
            <section className="card preview">
              <div className="sectionhead">
                <div><h3>DC preview · {preview.dc_number}</h3><p className="muted">{fmtDate(preview.dc_date)}</p></div>
                <div className="buttonrow">
                  <button onClick={() => downloadPDF(preview)} className="primary">Download PDF</button>
                  <button onClick={() => setPreview(null)}>Close</button>
                </div>
              </div>
              <ChallanPreview record={preview} />
            </section>
          )}
        </>
      )}

      <footer>Shared records require a configured Supabase project and an authenticated account.</footer>
    </main>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="field">
      <span>{label}{required && <b className="required"> *</b>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function RecordTable({ records, onView, onPDF }) {
  if (!records.length) return <div className="empty"><strong>No challans found</strong><p>Create a DC or adjust your search filters.</p></div>;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>DC number</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Transport Mode</th>
            <th>Materials</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id}>
              <td><strong>{r.dc_number}</strong></td>
              <td>{fmtDate(r.dc_date)}</td>
              <td>{r.vehicle_number}</td>
              <td>{r.transport_mode || 'VRL LOGISTICS'}</td>
              <td>{(r.materials || []).length} item(s)</td>
              <td>
                <div className="buttonrow">
                  <button onClick={() => onView(r)}>View</button>
                  <button onClick={() => onPDF(r)}>PDF</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChallanPreview({ record: r }) {
  const items = r.materials || [];
  const total = items.reduce((acc, m) => acc + (Number(m.qty || m.quantity || 0) * Number(m.rate || 0)), 0);

  return (
    <div className="paper" style={{ padding: '20px', background: '#fff', color: '#000', border: '1px solid #003366' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #003366', paddingBottom: '10px', marginBottom: '15px' }}>
        <div>
          <h2 style={{ color: '#003366', margin: 0, fontSize: '16px' }}>AtomPlus Technologies Private Limited</h2>
          <small style={{ color: '#666' }}>https://atomplus.in[cite: 3]<br/>Regd Office: Bangalore, India[cite: 5]<br/>CIN: U40106KA2022PTC165701[cite: 5]</small>
        </div>
        <div style={{ textAlign: 'right' }}>
          <b style={{ color: '#003366' }}>Innovative Solutions<br/>for a Better Tomorrow[cite: 5]</b>
        </div>
      </div>
      <h3 style={{ background: '#003366', color: '#fff', textAlign: 'center', padding: '6px', margin: '0 0 15px 0' }}>DELIVERY CHALLAN[cite: 5]</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '11px' }}>
        <div><b>Dispatch From:</b><p style={{ whiteSpace: 'pre-line', margin: '4px 0' }}>{r.ship_from_address || r.from_address}</p></div>
        <div>
          <p style={{ margin: '2px 0' }}><b>DC No:</b> {r.dc_number}</p>
          <p style={{ margin: '2px 0' }}><b>Date:</b> {fmtDate(r.dc_date)}</p>
          <p style={{ margin: '2px 0' }}><b>Transport Mode:</b> {r.transport_mode || 'VRL LOGISTICS'}</p>
          <p style={{ margin: '2px 0' }}><b>Vehicle No:</b> {r.vehicle_number}</p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '15px' }}>
        <thead>
          <tr style={{ background: '#e6f0fa', color: '#003366' }}>
            <th style={{ border: '1px solid #003366', padding: '6px' }}>Sr.</th>
            <th style={{ border: '1px solid #003366', padding: '6px', textAlign: 'left' }}>Description of Goods</th>
            <th style={{ border: '1px solid #003366', padding: '6px' }}>HSN/SAC</th>
            <th style={{ border: '1px solid #003366', padding: '6px' }}>Unit</th>
            <th style={{ border: '1px solid #003366', padding: '6px' }}>Qty</th>
            <th style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>Rate</th>
            <th style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #003366', padding: '6px' }}>{m.name}</td>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'center' }}>{m.hsn || '83071000'}</td>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'center' }}>{m.unit || 'Nos'}</td>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'center' }}>{m.qty || m.quantity}</td>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>₹ {(Number(m.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>₹ {(Number(m.qty || m.quantity || 0) * Number(m.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
            <td colSpan="6" style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>TOTAL</td>
            <td style={{ border: '1px solid #003366', padding: '6px', textAlign: 'right' }}>₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ background: '#ffe599', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', marginBottom: '20px', border: '1px solid #003366' }}>
        {r.terms_of_delivery || 'Our own materials moved from one site to another.'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' }}>
        <small style={{ fontStyle: 'italic' }}>This is a computer-generated delivery challan.</small>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #003366', width: '180px', marginBottom: '4px' }}></div>
          <b>Authorised Signature[cite: 5]</b><br/>
          <small>For AtomPlus Technologies Pvt. Ltd.[cite: 5]</small>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
