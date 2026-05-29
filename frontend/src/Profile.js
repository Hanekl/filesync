import { useState } from 'react'
import { getApiUrl } from './config'

function Profile({ user, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('profile')

  // 프로필 탭
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    username: user.username || '',
    bio: user.bio || '',
  })
  const [errors, setErrors] = useState({})
  const [profilePicPreview, setProfilePicPreview] = useState(
    user.profile_picture ? `${getApiUrl()}/profile_pics/${user.profile_picture}` : null
  )
  const [profilePicFile, setProfilePicFile] = useState(null)

  // 설정 탭
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [notifySettings, setNotifySettings] = useState({
    notify_all: localStorage.getItem('notify_all') !== 'false',
    notify_announcement: localStorage.getItem('notify_announcement') !== 'false',
  })
  const [serverIp, setServerIp] = useState(localStorage.getItem('server_ip') || '')

  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePicFile(file)
    setProfilePicPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { setErrors({ name: '이름을 입력해주세요' }); return }
    try {
      if (profilePicFile) {
        const formData = new FormData()
        formData.append('file', profilePicFile)
        const picRes = await fetch(`${getApiUrl()}/users/profile-picture/${user.id}`, {
          method: 'POST',
          body: formData
        })
        const picData = await picRes.json()
        onUpdate({ ...user, profile_picture: picData.profile_picture })
      }
      await fetch(`${getApiUrl()}/users/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, username: form.username, bio: form.bio })
      })
      onUpdate({ ...user, name: form.name, phone: form.phone, email: form.email, username: form.username, bio: form.bio })
      setIsEditing(false)
      setProfilePicFile(null)
      showToast('프로필이 저장되었습니다!')
    } catch {
      showToast('저장에 실패했어요')
    }
  }

  const handleChangePassword = () => {
    if (!pwForm.current_password) { setErrors({ current_password: '현재 비밀번호를 입력해주세요' }); return }
    if (!pwForm.new_password) { setErrors({ new_password: '새 비밀번호를 입력해주세요' }); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setErrors({ confirm_password: '비밀번호가 일치하지 않아요' }); return }
    fetch(`${getApiUrl()}/users/password/${user.id}`, {
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

  const handleToggleNotify = (key) => {
    const newVal = !notifySettings[key]
    localStorage.setItem(key, String(newVal))
    setNotifySettings(prev => ({ ...prev, [key]: newVal }))
    const label = key === 'notify_all' ? '전체 알림' : '공지사항 알림'
    showToast(`${label} ${newVal ? '켬' : '끔'}`)
  }

  const handleSaveServerIp = () => {
    if (!serverIp.trim()) return
    localStorage.setItem('server_ip', serverIp.trim())
    showToast('서버 IP가 저장됐어요!')
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

  const Toggle = ({ value, onChange }) => (
    <div onClick={onChange}
      style={{ width: '44px', height: '24px', borderRadius: '12px', background: value ? '#534AB7' : '#ddd', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f8f8' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 상단 헤더 */}
      <div style={{ height: '44px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#888' }}>←</button>
        <span style={{ fontSize: '15px', fontWeight: '500' }}>내 프로필</span>
      </div>

      {/* 레이아웃 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '240px', borderRight: '1px solid #eee', background: 'white', flexShrink: 0, padding: '12px 0' }}>
          {[{ key: 'profile', label: '👤 프로필' }, { key: 'settings', label: '⚙️ 설정' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ width: '100%', padding: '10px 16px', border: 'none', background: activeTab === tab.key ? '#EEEDFE' : 'transparent', color: activeTab === tab.key ? '#3C3489' : '#555', fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === tab.key ? '500' : '400' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* 프로필 탭 */}
        {activeTab === 'profile' && (
          <>
            {/* 프로필 카드 */}
            <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '500', color: '#3C3489', overflow: 'hidden' }}>
                  {profilePicPreview
                    ? <img src={profilePicPreview} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (user.name?.[0] || '?')
                  }
                </div>
                {isEditing && (
                  <label style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px' }}>
                    📷
                    <input type="file" accept="image/*" onChange={handleProfilePicChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>{user.name}</p>
              {form.bio && !isEditing && <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>{form.bio}</p>}
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
                    <button onClick={() => { setIsEditing(false); setProfilePicFile(null); setProfilePicPreview(user.profile_picture ? `${getApiUrl()}/profile_pics/${user.profile_picture}` : null); setErrors({}) }}
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
                { key: 'bio', label: '한줄 소개' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#888' }}>{field.label}</label>
                  {isEditing ? (
                    <>
                      <input value={form[field.key]} onChange={e => { setForm(prev => ({ ...prev, [field.key]: e.target.value })); setErrors({}) }}
                        placeholder={field.key === 'bio' ? '한줄 소개를 입력해주세요' : ''}
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

              {[{ label: '부서', value: user.dept }, { label: '직책', value: user.role }].map(item => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#888' }}>{item.label}</label>
                  <p style={{ padding: '10px 12px', border: '1px solid #eee', borderRadius: '8px', fontSize: '13px', color: '#aaa', background: '#f8f8f8' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <>
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

            {/* 알림 설정 */}
            <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', fontWeight: '500' }}>알림 설정</p>
              {[
                { key: 'notify_all', label: '전체 알림', desc: '모든 알림을 끄거나 켜요' },
                { key: 'notify_announcement', label: '공지사항 알림', desc: '새 공지사항이 등록될 때 알림' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#333' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: '#aaa' }}>{item.desc}</p>
                  </div>
                  <Toggle value={notifySettings[item.key]} onChange={() => handleToggleNotify(item.key)} />
                </div>
              ))}
            </div>

            {/* 서버 설정 */}
            <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '500' }}>서버 설정</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>서버 IP 주소</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={serverIp} onChange={e => setServerIp(e.target.value)}
                    placeholder="예: 192.168.0.5"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <button onClick={handleSaveServerIp}
                    style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '12px', color: 'white' }}>
                    저장
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}

export default Profile