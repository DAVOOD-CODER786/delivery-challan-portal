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

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!supabase) { setAuthReady(true); return; }

    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      setRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data }) => { 
      setSession(data.session); 
      setAuthReady(true); 
    });
    
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setNewPassword('');
        setPassword('');
        setMessage('');
      }
    });
    return () => listener.subscription.unsubscribe();
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

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setBusy(false);
      notify('Auth session missing or expired. Please request a new password reset link.', true);
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
    if (recoveryMode) {
      return (
        <main className="shell auth">
          <header className="brand">
            <div className="logo">DC</div>
            <div>
              <h1>Delivery Challan Portal</h1>
              <p>Set your new password</p>
            </div>
          </header>
          <form className="card authform" onSubmit={updatePassword}>
            <h2>Reset Password</h2>
            <p className="muted">Enter your new secure password below.</p>
            <label>
              New Password
              <input 
                type="password" 
                minLength="8" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
                autoComplete="new-password"
              />
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? 'Updating…' : 'Update Password'}
            </button>
            {message && <p className={isError ? 'error' : 'success'}>{message}</p>}
          </form>
        </main>
      );
    }

    return (
      <main className="shell auth">
        <header className="brand">
          <div className="logo">DC</div>
          <div>
            <h1>Delivery Challan Portal</h1>
            <p>Team access • Searchable history • PDF export</p>
          </div>
        </header>
        <form className="card authform" onSubmit={authSubmit}>
          <h2>{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">Sign in to access your team's shared challans.</p>
          <label>
            Email address
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value
