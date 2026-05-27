import { useState } from 'react'

function Login({ onLogin }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgotPw, setShowForgotPw] = useState(false)

const handleLogin = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, password: password })
    })

    if (response.ok) {
      const data = await response.json()
      onLogin(data.user)
    } else {
      const data = await response.json()
      setError(data.detail || '아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  } catch (err) {
    setError('서버에 연결할 수 없어요. 백엔드 서버를 확인해주세요.')
  }
}

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '16px', padding: '40px', width: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ fontSize: '22px', fontWeight: '500', color: '#3C3489' }}>FileSync</p>
          <p style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>기업 파일 관리 시스템</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#888' }}>아이디</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="아이디 입력"
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#888' }}>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호 입력"
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {error && (
          <p style={{ fontSize: '12px', color: '#e53e3e', textAlign: 'center' }}>{error}</p>
        )}

          <div style={{ textAlign: 'right', marginBottom: '4px' }}>
            <button
              onClick={() => setShowForgotPw(!showForgotPw)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#534AB7' }}>
              비밀번호를 잊으셨나요?
            </button>
          </div>

          {showForgotPw && (
            <div style={{ background: '#f0effe', border: '1px solid #c4bff5', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#534AB7', lineHeight: '1.6' }}>
              관리자에게 임시 비밀번호 발급을 요청해주세요.<br/>
              임시 비밀번호로 로그인 후 반드시 변경해주세요.
            </div>
          )}

        <button
          onClick={handleLogin}
          style={{ padding: '11px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}
        >
          로그인
        </button>

        <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center' }}>계정이 없으신가요? 관리자에게 문의하세요.</p>
      </div>
    </div>
  )
}

export default Login