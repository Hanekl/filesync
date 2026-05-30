import { useState } from 'react'
import { getApiUrl } from './config'

function Onboarding({ currentUser, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', phone: '', email: '', new_username: currentUser.username, new_password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (step === 1) {
      if (!form.name.trim()) newErrors.name = '이름을 입력해주세요'
      if (!form.phone.trim()) newErrors.phone = '전화번호를 입력해주세요'
      if (!form.email.trim()) newErrors.email = '이메일을 입력해주세요'
    }
    if (step === 2) {
      if (!form.new_username.trim()) newErrors.new_username = '아이디를 입력해주세요'
      if (!form.new_password.trim()) newErrors.new_password = '비밀번호를 입력해주세요'
      if (form.new_password !== form.confirm_password) newErrors.confirm_password = '비밀번호가 일치하지 않아요'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleComplete = () => {
    if (!validate()) return
    fetch(`${getApiUrl()}/users/onboarding/${currentUser.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, new_username: form.new_username, new_password: form.new_password })
    }).then(r => r.json()).then(() => onComplete({ ...currentUser, name: form.name, username: form.new_username, is_first_login: false }))
  }

  const inputStyle = (err) => ({ padding: '10px 12px', border: `1px solid ${err ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' })

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '32px', width: '400px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: `0 4px 24px var(--shadow)`, color: 'var(--text)' }}>
        <div>
          <p style={{ fontSize: '20px', fontWeight: '600' }}>환영해요! 👋</p>
          <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)', marginTop: '6px' }}>처음 로그인하셨네요! 기본 정보를 입력해주세요.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= step ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--accent)' }}>1단계 · 기본 정보</p>
            {[
              { key: 'name', label: '이름', placeholder: '실명을 입력해주세요' },
              { key: 'phone', label: '전화번호', placeholder: '010-0000-0000' },
              { key: 'email', label: '이메일', placeholder: 'example@company.com' },
            ].map(field => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{field.label}</label>
                <input value={form[field.key]} onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (validate()) setStep(2) } }}
                  placeholder={field.placeholder} style={inputStyle(errors[field.key])} />
                {errors[field.key] && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{errors[field.key]}</p>}
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--accent)' }}>2단계 · 아이디 / 비밀번호 설정</p>
            {[
              { key: 'new_username', label: '새 아이디', placeholder: '사용할 아이디 입력' },
              { key: 'new_password', label: '새 비밀번호', placeholder: '비밀번호 입력', type: 'password' },
              { key: 'confirm_password', label: '비밀번호 확인', placeholder: '비밀번호 재입력', type: 'password' },
            ].map(field => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{field.label}</label>
                <input type={field.type || 'text'} value={form[field.key]} onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleComplete() }}
                  placeholder={field.placeholder} style={inputStyle(errors[field.key])} />
                {errors[field.key] && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{errors[field.key]}</p>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {step === 2 && (
            <button onClick={() => setStep(1)}
              style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
              이전
            </button>
          )}
          <button onClick={() => { if (step === 1) { if (validate()) setStep(2) } else handleComplete() }}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>
            {step === 1 ? '다음' : '완료하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Onboarding