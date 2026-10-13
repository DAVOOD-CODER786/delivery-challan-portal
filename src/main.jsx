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
              onChange={e => setEmail(e.target.value)} 
              required 
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input 
              type="password" 
              minLength="8" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>
          
          {authMode === 'signin' && (
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
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

          <button className="primary full" disabled={busy}>
            {busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          
          <button 
            type="button" 
            className="linkbtn" 
            onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); notify(''); }}
          >
            {authMode === 'signin' ? "Need an account? Sign up" : "Already registered? Sign in"}
          </button>
          
          {message && <p className={isError ? 'error' : 'success'}>{message}</p>}
        </form>
      </main>
    );
  }
