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
  from_address: '',
  to_address: '',
  vehicle_number: '',
  driver_name: '',
  driver_phone: '',
  receiver_name: '',
  receiver_phone: '',
  materials: [{ name: '', qty: '', unit: 'Nos' }]
});

const fmtDate = s => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN') : '';
const clean = v => String(v ?? '').trim();

function TruckGraphic() {
  return (
    <svg className="truck-graphic" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background City Silhouette */}
      <path d="M50 220V150H90V220H130V120H170V220H230V100H280V220H340V140H380V220H450V220Z" fill="#0d593b" opacity="0.5"/>
      
      {/* Winding Road */}
      <path d="M-20 280 C 150 280, 200 180, 520 180" stroke="#ffffff" strokeWidth="36" opacity="0.2" strokeLinecap="round"/>
      <path d="M-20 280 C 150 280, 200 180, 520 180" stroke="#ffffff" strokeWidth="2" strokeDasharray="12 12" opacity="0.6"/>

      {/* Map Pins */}
      <g fill="#E5C158">
        <path d="M120 160 C120 150, 135 135, 135 120 C135 110, 128 100, 120 100 C112 100, 105 110, 105 120 C105 135, 120 150, 120 160 Z"/>
        <circle cx="120" cy="120" r="5" fill="#0b4d33"/>

        <path d="M380 130 C380 120, 395 105, 395 90 C395 80, 388 70, 380 70 C372 70, 365 80, 365 90 C365 105, 380 120, 380 130 Z"/>
        <circle cx="380" cy="90" r="5" fill="#0b4d33"/>

        <path d="M260 250 C260 240, 275 225, 275 210 C275 200, 268 190, 260 190 C252 190, 245 200, 245 210 C245 225, 260 240, 260 250 Z"/>
        <circle cx="260" cy="210" r="5" fill="#0b4d33"/>
      </g>

      {/* Delivery Truck */}
      <g transform="translate(160, 185)">
        {/* Cargo Body */}
        <rect x="0" y="0" width="130" height="70" rx="6" fill="#FFFFFF" />
        <rect x="10" y="10" width="110" height="50" rx="3" fill="#E8EFEC" />
        {/* DC Logo on Truck */}
        <rect x="45" y="20" width="30" height="30" rx="6" fill="#0b4d33" />
        <text x="60" y="40" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">DC</text>
        
        {/* Truck Cabin */}
        <path d="M130 20 H160 L180 45 V70 H130 Z" fill="#2E7D5B" />
        {/* Windshield */}
        <path d="M142 26 H158 L170 42 H142 Z" fill="#A3D9C9" />
        
        {/* Wheels */}
        <circle cx="30" cy="72" r="16" fill="#1F2923" />
        <circle cx="30" cy="72" r="7" fill="#E8EFEC" />
        <circle cx="100" cy="72" r="16" fill="#1F2923" />
        <circle cx="100" cy="72" r="7" fill="#E8EFEC" />
        <circle cx="155" cy="72" r="16" fill="#1F2923" />
        <circle cx="155" cy="72" r="7" fill="#E8EFEC" />
        
        {/* Headlight */}
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

  const hashParams = new URLSearchParams(
    window.location.hash.slice(1)
  );
  const queryParams = new URLSearchParams(
    window.location.search
  );

  const isRecoveryLink =
    hashParams.get('type') === 'recovery' ||
    queryParams.get('type') === 'recovery';

  if (isRecoveryLink) {
    setRecoveryMode(true);
  }

  let mounted = true;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, s) => {
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
    setAuthReady(true);

    setSession(data.session);
setAuthReady(true);
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  useEffect(() => { if (session && supabase) loadRecords(); }, [session]);

  async function loadRecords() {
    setBusy(true);
    const { data, error } = await supabase.from('delivery_challans').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) notify(error.message, true); else setRecords(data || []);
    setBusy(false);
  }

  async function authSubmit(e) {
    e.preventDefault(); setBusy(true); notify('');
    const result = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) notify(result.error.message, true);
    else if (authMode === 'signup' && !result.data.session) notify('Account created. Check your email to confirm the account before signing in.');
    else notify(authMode === 'signin' ? 'Signed in.' : 'Account created.');
  }

async function handleForgotPassword() {
  if (!email) {
    notify('Please enter your email address above first.', true);
    return;
  }

  setBusy(true);
  notify('');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://delivery-challan-portal.vercel.app',
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

    const { data: sessionData, error: sessionError } =
  await supabase.auth.getSession();

if (sessionError || !sessionData.session) {
  setBusy(false);
  notify(
    'Your reset link has expired or no recovery session was created. Request a new reset link.',
    true
  );
  return;
}
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
    const required = [
      ['dc_date', 'DC date'],
      ['from_address', 'Dispatch address'],
      ['to_address', 'Delivery address'],
      ['vehicle_number', 'Vehicle number'],
      ['driver_name', 'Driver name'],
      ['driver_phone', 'Driver mobile'],
      ['receiver_name', 'Receiver name'],
      ['receiver_phone', 'Receiver mobile']
    ];
    for (const [k, label] of required) if (!clean(form[k])) return `${label} is required.`;
    const phone = /^\+?[\d\s()-]{7,20}$/;
    if (!phone.test(form.driver_phone)) return 'Enter a valid driver mobile number.';
    if (!phone.test(form.receiver_phone)) return 'Enter a valid receiver mobile number.';
    if (!form.materials.length) return 'Add at least one material.';
    for (let i = 0; i < form.materials.length; i++) {
      const m = form.materials[i];
      if (!clean(m.name)) return `Material ${i + 1}: name is required.`;
      if (!Number.isFinite(Number(m.qty)) || Number(m.qty) <= 0) return `Material ${i + 1}: quantity must be greater than zero.`;
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
      const row = { ...form, dc_number, materials: form.materials.map(m => ({ ...m, name: clean(m.name), qty: Number(m.qty), unit: clean(m.unit) })), created_by: session.user.id };
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

  async function signOut() { await supabase.auth.signOut(); setRecords([]); setPreview(null); }

  const filtered = useMemo(() => records.filter(r => {
    const hay = [r.dc_number, r.vehicle_number, r.receiver_name, r.driver_name, r.from_address, r.to_address, ...(r.materials || []).map(m => m.name)].join(' ').toLowerCase();
    return (!search || hay.includes(search.toLowerCase())) && (!dateFilter || r.dc_date === dateFilter);
  }), [records, search, dateFilter]);

  const today = new Date().toISOString().slice(0, 10);

  function downloadPDF(r) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text('DELIVERY CHALLAN', 105, 18, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`DC Number: ${r.dc_number}`, 14, 29); doc.text(`Date: ${fmtDate(r.dc_date)}`, 196, 29, { align: 'right' });
    autoTable(doc, { startY: 35, head: [['DISPATCH FROM', 'DELIVER TO']], body: [[r.from_address, r.to_address]], styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: [232, 239, 235], textColor: [20, 40, 32] } });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 7, head: [['Sr.', 'Material description', 'Quantity', 'Unit']], body: (r.materials || []).map((m, i) => [i + 1, m.name, m.qty, m.unit]), styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [232, 239, 235], textColor: [20, 40, 32] } });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 7, head: [['TRANSPORT DETAILS', 'DETAILS']], body: [['Vehicle number', r.vehicle_number], ['Driver name', r.driver_name], ['Driver mobile', r.driver_phone], ['Receiver name', r.receiver_name], ['Receiver mobile', r.receiver_phone]], styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [232, 239, 235], textColor: [20, 40, 32] } });
    const y = Math.min(doc.lastAutoTable.finalY + 24, 270);
    doc.setFontSize(9); doc.text('Authorized Signatory', 18, y); doc.text('Receiver Signature', 145, y);
    doc.line(14, y - 5, 75, y - 5); doc.line(140, y - 5, 196, y - 5);
    doc.save(`${r.dc_number.replace(/[^a-z0-9-_]/gi, '_')}.pdf`);
  }

  function viewDC(r) { setPreview(r); setActive('history'); }

  if (!authReady) return <main className="shell"><p>Loading portal…</p></main>;

  if (!supabase) return (
    <main className="shell">
      <header className="brand">
        <div className="logo">DC</div>
        <div><h1>Delivery Challan Portal</h1><p>Shared challan history for your team</p></div>
      </header>
      <section className="card setup">
        <h2>Connect your shared database</h2>
        <p>This project is ready to connect to Supabase for secure sign-in and shared records.</p>
        <ol>
          <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
          <li>In the SQL Editor, run <code>supabase/schema.sql</code> from this project.</li>
          <li>Copy your project URL and publishable/anon key into a new <code>.env</code> file using <code>.env.example</code>.</li>
          <li>Run <code>npm install</code> and <code>npm run dev</code>, or deploy the project to a static host with those environment variables.</li>
        </ol>
        <p className="note">Do not put a Supabase service-role key in browser code. The app uses authenticated sessions and database row-level security.</p>
      </section>
    </main>
  );

  if (!session) {
    return (
      <main className="shell auth">
        <div className="auth-container">
          {/* Left Column: Form Controls */}
          <div className="auth-left">
            <header className="brand" style={{ marginBottom: '20px' }}>
              <div className="logo">DC</div>
              <div>
                <h1 style={{ fontSize: '1.4rem' }}>Delivery Challan Portal</h1>
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
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#006644', fontWeight: 'bold' }}
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
                      style={{ width: '100%', paddingRight: '60px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#006644', fontWeight: 'bold' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                {authMode === 'signin' && (
                  <div style={{ textAlign: 'right', marginTop: '6px', marginBottom: '16px' }}>
                    <button 
                      type="button" 
                      className="linkbtn" 
                      onClick={handleForgotPassword}
                      style={{ fontSize: '0.85rem', padding: 0 }}
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
                
                {message && <p className={isError ? 'error' : 'success'} style={{ marginTop: '15px' }}>{message}</p>}
              </form>
            )}
          </div>

          {/* Right Column: Truck Route Illustration */}
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
          <div className="logo">DC</div>
          <div><h1>Delivery Challan</h1><p>Management Portal</p></div>
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
          <div className="pagehead"><div><h2>Create delivery challan</h2><p>Complete the details, then save the DC to shared history.</p></div></div>
          <form className="card dcform" onSubmit={createDC}>
            <h3>Challan details</h3>
            <div className="formgrid">
              <Field label="DC date" required><input type="date" value={form.dc_date} onChange={e => setField('dc_date', e.target.value)} required /></Field>
              <Field label="DC number" hint="Leave blank to suggest a number"><input value={form.dc_number} onChange={e => setField('dc_number', e.target.value)} placeholder="Auto-suggested on save" /></Field>
              <Field label="Dispatch from address" required><textarea value={form.from_address} onChange={e => setField('from_address', e.target.value)} rows="3" required placeholder="Company, street, city, PIN" /></Field>
              <Field label="Delivery to address" required><textarea value={form.to_address} onChange={e => setField('to_address', e.target.value)} rows="3" required placeholder="Company, street, city, PIN" /></Field>
            </div>
            <div className="sectionhead">
              <h3>Material list</h3>
              <button type="button" onClick={() => setForm(p => ({ ...p, materials: [...p.materials, { name: '', qty: '', unit: 'Nos' }] }))}>+ Add material</button>
            </div>
            {form.materials.map((m, i) => (
              <div className="materialrow" key={i}>
                <Field label={`Material ${i + 1}`} required><input value={m.name} onChange={e => setMaterial(i, 'name', e.target.value)} required placeholder="Material name" /></Field>
                <Field label="Quantity" required><input type="number" min="0.001" step="any" value={m.qty} onChange={e => setMaterial(i, 'qty', e.target.value)} required placeholder="0" /></Field>
                <Field label="Unit" required>
                  <select value={m.unit} onChange={e => setMaterial(i, 'unit', e.target.value)}>
                    {['Nos', 'Kg', 'Ton', 'Meters', 'Boxes', 'Litres', 'Other'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                {form.materials.length > 1 && <button type="button" className="remove" onClick={() => setForm(p => ({ ...p, materials: p.materials.filter((_, j) => j !== i) }))}>Remove</button>}
              </div>
            ))}
            <h3 className="subhead">Vehicle and driver</h3>
            <div className="formgrid">
              <Field label="Vehicle number" required><input value={form.vehicle_number} onChange={e => setField('vehicle_number', e.target.value.toUpperCase())} required placeholder="e.g. MH 13 AB 1234" /></Field>
              <Field label="Driver name" required><input value={form.driver_name} onChange={e => setField('driver_name', e.target.value)} required /></Field>
              <Field label="Driver mobile number" required><input type="tel" value={form.driver_phone} onChange={e => setField('driver_phone', e.target.value)} required placeholder="Mobile number" /></Field>
            </div>
            <h3 className="subhead">Receiver details</h3>
            <div className="formgrid">
              <Field label="Receiver name" required><input value={form.receiver_name} onChange={e => setField('receiver_name', e.target.value)} required /></Field>
              <Field label="Receiver mobile number" required><input type="tel" value={form.receiver_phone} onChange={e => setField('receiver_phone', e.target.value)} required placeholder="Mobile number" /></Field>
            </div>
            <div className="formactions">
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search DC, vehicle, receiver, material…" />
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
            <th>Receiver</th>
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
              <td>{r.receiver_name}</td>
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
  return (
    <div className="paper">
      <h2>DELIVERY CHALLAN</h2>
      <div className="paperline"><b>DC Number:</b> {r.dc_number}<b>Date:</b> {fmtDate(r.dc_date)}</div>
      <div className="addressgrid">
        <div><b>DISPATCH FROM</b><p>{r.from_address}</p></div>
        <div><b>DELIVER TO</b><p>{r.to_address}</p></div>
      </div>
      <h4>Material details</h4>
      <table>
        <thead>
          <tr><th>Sr.</th><th>Material</th><th>Quantity</th><th>Unit</th></tr>
        </thead>
        <tbody>
          {(r.materials || []).map((m, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{m.name}</td>
              <td>{m.qty}</td>
              <td>{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Transport and receiver</h4>
      <div className="paperdetails">
        <p><b>Vehicle:</b> {r.vehicle_number}</p>
        <p><b>Driver:</b> {r.driver_name} · {r.driver_phone}</p>
        <p><b>Receiver:</b> {r.receiver_name} · {r.receiver_phone}</p>
      </div>
      <div className="signatures">
        <span>Authorized signatory</span>
        <span>Receiver signature</span>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
