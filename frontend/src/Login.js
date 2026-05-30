import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

function Login({ onLogin }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgotPw, setShowForgotPw] = useState(false)
  const [showIpSetup, setShowIpSetup] = useState(false)
  const [ipInput, setIpInput] = useState('')
  const [updateProgress, setUpdateProgress] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    const savedIp = localStorage.getItem('server_ip')
    if (!savedIp) setShowIpSetup(true)
    else setIpInput(savedIp)
    const handleProgress = (e) => setUpdateProgress(e.detail)
    const handleDownloaded = () => { setUpdateDownloaded(true); setUpdateProgress(null) }
    window.addEventListener('update-progress', handleProgress)
    window.addEventListener('update-downloaded', handleDownloaded)
    return () => {
      window.removeEventListener('update-progress', handleProgress)
      window.removeEventListener('update-downloaded', handleDownloaded)
    }
  }, [])

  const handleSaveIp = () => {
    if (!ipInput.trim()) return
    localStorage.setItem('server_ip', ipInput.trim())
    setShowIpSetup(false)
  }

  const handleLogin = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/users/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, password: password })
      })
      if (response.ok) {
        const data = await response.json()
        onLogin(data.user)
      } else {
        const data = await response.json()
        setError(data.detail || '아이디 또는 비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없어요. IP 주소를 확인해주세요.')
    }
  }

  const inputStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }

  if (showIpSetup) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', width: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '22px', fontWeight: '500', color: 'var(--accent)' }}>FileSync</p>
            <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)', marginTop: '4px' }}>서버 설정</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>서버 IP 주소</label>
            <input value={ipInput} onChange={e => setIpInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveIp()}
              placeholder="예: 192.168.0.5" style={inputStyle} />
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>관리자에게 서버 IP를 문의하세요.</p>
          </div>
          <button onClick={handleSaveIp}
            style={{ padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', fontSize: 'var(--font-size-lg)', fontWeight: '500', cursor: 'pointer' }}>
            확인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>

      {/* 업데이트 진행 카드 */}
      {(updateProgress !== null || updateDownloaded) && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', boxShadow: `0 4px 16px var(--shadow)`, zIndex: 9999, minWidth: '220px' }}>
          {updateDownloaded ? (
            <>
              <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>✅ 업데이트 준비 완료</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>앱을 재시작하면 적용돼요</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>🔄 업데이트 다운로드 중...</p>
              <div style={{ marginTop: '8px', background: 'var(--surface-alt)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${updateProgress}%`, background: 'var(--accent)', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>{updateProgress}%</p>
            </>
          )}
        </div>
      )}

      <div style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', width: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <span style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '10px', color: 'var(--text-muted)' }}>
          v{window.__APP_VERSION__ || ''}
        </span>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ fontSize: '22px', fontWeight: '500', color: 'var(--accent)' }}>FileSync</p>
          <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)', marginTop: '4px' }}>기업 파일 관리 시스템</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>아이디</label>
          <input value={id} onChange={e => setId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="아이디 입력" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>비밀번호</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호 입력" style={inputStyle} />
        </div>
        {error && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
        <div style={{ textAlign: 'right', marginBottom: '4px' }}>
          <button onClick={() => setShowForgotPw(!showForgotPw)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
            비밀번호를 잊으셨나요?
          </button>
        </div>
        {showForgotPw && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '12px 14px', fontSize: 'var(--font-size-sm)', color: 'var(--accent)', lineHeight: '1.6' }}>
            관리자에게 임시 비밀번호 발급을 요청해주세요.<br />
            임시 비밀번호로 로그인 후 반드시 변경해주세요.
          </div>
        )}
        <button onClick={handleLogin}
          style={{ padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', fontSize: 'var(--font-size-lg)', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}>
          로그인
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>계정이 없으신가요? 관리자에게 문의하세요.</p>
          <button onClick={() => setShowIpSetup(true)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            서버 설정
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login