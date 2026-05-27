import { useState } from 'react'

function Profile({ user, onBack, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    username: user.username || '',
  })
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [toast, setToast] = useState('')
  const [errors, setErrors] = useState({})

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSaveProfile = () => {
    if (!form.name.trim()) { setErrors({ name: '이름을 입력해주세요' }); return }
    fetch(`${process.env.REACT_APP_API_URL}/users/profile/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, username: form.username })
    }).then(r => r.json())
      .then(() => {
        onUpdate({ ...user, name: form.name, phone: form.phone, email: form.email, username: form.username })
        setIsEditing(false)
        showToast('프로필이 저장되었습니다!')
      })
  }

  const handleChangePassword = () => {
    if (!pwForm.current_password) { setErrors({ current_password: '현재 비밀번호를 입력해주세요' }); return }
    if (!pwForm.new_password) { setErrors({ new_password: '새 비밀번호를 입력해주세요' }); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setErrors({ confirm_password: '비밀번호가 일치하지 않아요' }); return }
    fetch(`${process.env.REACT_APP_API_URL}/users/password/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password })
    }).then(r => r.json())
      .then((data) => {
        if (data.detail) { setErrors({ current_password: data.detail }); return }
        setIsChangingPw(false)
        setPwForm({ current_password: '', new_password: '', confirm_password: '' })
        showToast('비밀번호가 변경되었습니다!')
      })
  }

  const gradeLabel = {
    super_admin: '최고 관리자', admin: '관리자', manager: '부서 관리자', member: '일반 직원', guest: '외부 협력사'
  }
  const gradeColor = {
    super_admin: { bg: '#EEEDFE', color: '#3C3489' },
    admin: { bg: '#FAECE7', color: '#993C1D' },
    manager: { bg: '#E1F5EE', color: '#085041' },
    member: { bg: '#f0f0f0', color: '#555' },
    guest: { bg: '#FAEEDA', color: '#854F0B' },
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f8f8' }}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 상단 */}
      <div style={{ height: '44px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px' }}>
        <button onClick={onBack}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#888' }}>←</button>
        <span style={{ fontSize: '15px', fontWeight: '500' }}>내 프로필</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        {/* 프로필 카드 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '500', color: '#3C3489' }}>
            {user.name?.[0] || '?'}
          </div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>{user.name}</p>
          <p style={{ fontSize: '13px', color: '#888' }}>{user.dept} · {user.role}</p>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: gradeColor[user.grade]?.bg, color: gradeColor[user.grade]?.color }}>
            {gradeLabel[user.grade] || user.grade}
          </span>
        </div>

        {/* 내 정보 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: '500' }}>내 정보</p>
            {!isEditing ? (
              <button onClick={() => { setIsEditing(true); setErrors({}) }}
                style={{ padding: '5px 12px', border: '1px solid #534AB7', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#534AB7' }}>
                수정하기
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setIsEditing(false); setForm({ name: user.name, phone: user.phone || '', email: user.email || '' }); setErrors({}) }}
                  style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
                  취소
                </button>
                <button onClick={handleSaveProfile}
                  style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', background: '#534AB7', cursor: 'pointer', fontSize: '12px', color: 'white' }}>
                  저장
                </button>
              </div>
            )}
          </div>

          {[
            { key: 'name', label: '이름' },
            { key: 'username', label: '아이디' },
            { key: 'phone', label: '전화번호' },
            { key: 'email', label: '이메일' },
          ].map(field => (
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>{field.label}</label>
              {isEditing ? (
                <>
                  <input value={form[field.key]} onChange={e => { setForm(prev => ({ ...prev, [field.key]: e.target.value })); setErrors({}) }}
                    style={{ padding: '10px 12px', border: `1px solid ${errors[field.key] ? '#e53e3e' : '#ddd'}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  {errors[field.key] && <p style={{ fontSize: '11px', color: '#e53e3e' }}>{errors[field.key]}</p>}
                </>
              ) : (
                <p style={{ padding: '10px 12px', border: '1px solid #eee', borderRadius: '8px', fontSize: '13px', color: form[field.key] ? '#333' : '#aaa', background: '#f8f8f8' }}>
                  {form[field.key] || '미입력'}
                </p>
              )}
            </div>
          ))}

          {/* 변경 불가 정보 */}
          {[
            { label: '부서', value: user.dept },
            { label: '직책', value: user.role },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>{item.label}</label>
              <p style={{ padding: '10px 12px', border: '1px solid #eee', borderRadius: '8px', fontSize: '13px', color: '#aaa', background: '#f8f8f8' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* 비밀번호 변경 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: '500' }}>비밀번호 변경</p>
            {!isChangingPw ? (
              <button onClick={() => { setIsChangingPw(true); setErrors({}) }}
                style={{ padding: '5px 12px', border: '1px solid #534AB7', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#534AB7' }}>
                변경하기
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setIsChangingPw(false); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); setErrors({}) }}
                  style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
                  취소
                </button>
                <button onClick={handleChangePassword}
                  style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', background: '#534AB7', cursor: 'pointer', fontSize: '12px', color: 'white' }}>
                  저장
                </button>
              </div>
            )}
          </div>

          {!isChangingPw ? (
            <p style={{ fontSize: '13px', color: '#aaa' }}>••••••••</p>
          ) : (
            [
              { key: 'current_password', label: '현재 비밀번호', placeholder: '현재 비밀번호 입력' },
              { key: 'new_password', label: '새 비밀번호', placeholder: '새 비밀번호 입력' },
              { key: 'confirm_password', label: '새 비밀번호 확인', placeholder: '새 비밀번호 재입력' },
            ].map(field => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>{field.label}</label>
                <input type="password" value={pwForm[field.key]}
                  onChange={e => { setPwForm(prev => ({ ...prev, [field.key]: e.target.value })); setErrors({}) }}
                  placeholder={field.placeholder}
                  style={{ padding: '10px 12px', border: `1px solid ${errors[field.key] ? '#e53e3e' : '#ddd'}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                {errors[field.key] && <p style={{ fontSize: '11px', color: '#e53e3e' }}>{errors[field.key]}</p>}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

export default Profile