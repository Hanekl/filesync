import { useState } from 'react'
import { getApiUrl } from './config'
import { themes, fontFamilies, fontSizes, applyTheme, applyFontFamily, applyFontSize } from './theme'

const gradeLabel = { super_admin: '시스템 관리자', user: '일반 직원', guest: '외부 협력사' }
const gradeColor = {
  super_admin: { bg: 'var(--accent-light)', color: 'var(--accent)' },
  user:        { bg: 'var(--surface-alt)',  color: 'var(--text-sub)' },
  guest:       { bg: '#FAEEDA',             color: '#854F0B' },
}

const Toggle = ({ value, onChange }) => (
  <div onClick={onChange}
    style={{ width: '44px', height: '24px', borderRadius: '12px', background: value ? 'var(--accent)' : '#ddd', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
  </div>
)

function Profile({ user, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [toast, setToast] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    name: user.name || '', phone: user.phone || '',
    email: user.email || '', username: user.username || '', bio: user.bio || '',
  })
  const [errors, setErrors] = useState({})
  const [profilePicPreview, setProfilePicPreview] = useState(
    user.profile_picture ? `${getApiUrl()}/profile_pics/${user.profile_picture}` : null
  )
  const [profilePicFile, setProfilePicFile] = useState(null)
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [notifySettings, setNotifySettings] = useState({
    notify_all: localStorage.getItem('notify_all') !== 'false',
    notify_announcement: localStorage.getItem('notify_announcement') !== 'false',
  })
  const [serverIp, setServerIp] = useState(localStorage.getItem('server_ip') || '')
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'tanzanite')
  const [currentFont, setCurrentFont] = useState(localStorage.getItem('font_family') || 'pretendard')
  const [currentSize, setCurrentSize] = useState(localStorage.getItem('font_size') || 'md')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
        const picRes = await fetch(`${getApiUrl()}/users/profile-picture/${user.id}`, { method: 'POST', body: formData })
        const picData = await picRes.json()
        onUpdate({ ...user, profile_picture: picData.profile_picture })
      }
      await fetch(`${getApiUrl()}/users/profile/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, username: form.username, bio: form.bio })
      })
      onUpdate({ ...user, name: form.name, phone: form.phone, email: form.email, username: form.username, bio: form.bio })
      setIsEditing(false); setProfilePicFile(null)
      showToast('프로필이 저장되었습니다!')
    } catch { showToast('저장에 실패했어요') }
  }

  const handleChangePassword = () => {
    if (!pwForm.current_password) { setErrors({ current_password: '현재 비밀번호를 입력해주세요' }); return }
    if (!pwForm.new_password) { setErrors({ new_password: '새 비밀번호를 입력해주세요' }); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setErrors({ confirm_password: '비밀번호가 일치하지 않아요' }); return }
    fetch(`${getApiUrl()}/users/password/${user.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password })
    }).then(r => r.json()).then(data => {
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
    showToast(`${key === 'notify_all' ? '전체 알림' : '공지사항 알림'} ${newVal ? '켬' : '끔'}`)
  }

  const handleSaveServerIp = () => {
    if (!serverIp.trim()) return
    localStorage.setItem('server_ip', serverIp.trim())
    showToast('서버 IP가 저장됐어요! 앱을 재시작해주세요.')
  }

  const handleTheme = (key) => {
    setCurrentTheme(key)
    applyTheme(key)
    showToast(`테마: ${themes[key]?.name}`)
  }

  const handleFont = (key) => {
    setCurrentFont(key)
    applyFontFamily(key)
    const font = fontFamilies.find(f => f.key === key)
    showToast(`글꼴: ${font?.label}`)
  }

  const handleSize = (key) => {
    setCurrentSize(key)
    applyFontSize(key)
    const size = fontSizes.find(s => s.key === key)
    showToast(`글꼴 크기: ${size?.label}`)
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }
  const inputStyle = (err) => ({ padding: '10px 12px', border: `1px solid ${err ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' })
  const readStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', color: 'var(--text-muted)', background: 'var(--surface-alt)' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-family)' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '10px 20px', borderRadius: '20px', fontSize: 'var(--font-size)', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ height: '44px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-sub)' }}>←</button>
        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>내 프로필</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '200px', borderRight: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, padding: '12px 0' }}>
          {[
            { key: 'profile',  label: '👤 프로필' },
            { key: 'settings', label: '⚙️ 설정' },
            { key: 'theme',    label: '🎨 테마' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ width: '100%', padding: '10px 16px', border: 'none', background: activeTab === tab.key ? 'var(--accent-light)' : 'transparent', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-sub)', fontSize: 'var(--font-size)', cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === tab.key ? '500' : '400', borderLeft: activeTab === tab.key ? '3px solid var(--accent)' : '3px solid transparent' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ===== 프로필 탭 ===== */}
          {activeTab === 'profile' && (
            <>
              <div style={{ ...card, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '500', color: 'var(--accent)', overflow: 'hidden' }}>
                    {profilePicPreview
                      ? <img src={profilePicPreview} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user.name?.[0] || '?')}
                  </div>
                  {isEditing && (
                    <label style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px' }}>
                      📷<input type="file" accept="image/*" onChange={handleProfilePicChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>{user.name}</p>
                {form.bio && !isEditing && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', textAlign: 'center' }}>{form.bio}</p>}
                <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>{user.dept} · {user.role}</p>
                <span style={{ fontSize: 'var(--font-size-sm)', padding: '3px 10px', borderRadius: '10px', background: gradeColor[user.grade]?.bg, color: gradeColor[user.grade]?.color }}>
                  {gradeLabel[user.grade] || user.grade}
                </span>
              </div>

              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>내 정보</p>
                  {!isEditing ? (
                    <button onClick={() => { setIsEditing(true); setErrors({}) }}
                      style={{ padding: '5px 12px', border: '1px solid var(--accent)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
                      수정하기
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setIsEditing(false); setProfilePicFile(null); setProfilePicPreview(user.profile_picture ? `${getApiUrl()}/profile_pics/${user.profile_picture}` : null); setErrors({}) }}
                        style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>취소</button>
                      <button onClick={handleSaveProfile}
                        style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent-text)' }}>저장</button>
                    </div>
                  )}
                </div>
                {[
                  { key: 'name', label: '이름' }, { key: 'username', label: '아이디' },
                  { key: 'phone', label: '전화번호' }, { key: 'email', label: '이메일' },
                  { key: 'bio', label: '한줄 소개' },
                ].map(field => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{field.label}</label>
                    {isEditing ? (
                      <>
                        <input value={form[field.key]} onChange={e => { setForm(prev => ({ ...prev, [field.key]: e.target.value })); setErrors({}) }}
                          placeholder={field.key === 'bio' ? '한줄 소개를 입력해주세요' : ''}
                          style={inputStyle(errors[field.key])} />
                        {errors[field.key] && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{errors[field.key]}</p>}
                      </>
                    ) : (
                      <p style={{ ...readStyle, color: form[field.key] ? 'var(--text)' : 'var(--text-muted)' }}>{form[field.key] || '미입력'}</p>
                    )}
                  </div>
                ))}
                {[{ label: '부서', value: user.dept }, { label: '직책', value: user.role }].map(item => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{item.label}</label>
                    <p style={readStyle}>{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== 설정 탭 ===== */}
          {activeTab === 'settings' && (
            <>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>비밀번호 변경</p>
                  {!isChangingPw ? (
                    <button onClick={() => { setIsChangingPw(true); setErrors({}) }}
                      style={{ padding: '5px 12px', border: '1px solid var(--accent)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
                      변경하기
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setIsChangingPw(false); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); setErrors({}) }}
                        style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>취소</button>
                      <button onClick={handleChangePassword}
                        style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent-text)' }}>저장</button>
                    </div>
                  )}
                </div>
                {!isChangingPw ? (
                  <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)' }}>••••••••</p>
                ) : (
                  [
                    { key: 'current_password', label: '현재 비밀번호', placeholder: '현재 비밀번호 입력' },
                    { key: 'new_password', label: '새 비밀번호', placeholder: '새 비밀번호 입력' },
                    { key: 'confirm_password', label: '새 비밀번호 확인', placeholder: '새 비밀번호 재입력' },
                  ].map(field => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{field.label}</label>
                      <input type="password" value={pwForm[field.key]}
                        onChange={e => { setPwForm(prev => ({ ...prev, [field.key]: e.target.value })); setErrors({}) }}
                        placeholder={field.placeholder} style={inputStyle(errors[field.key])} />
                      {errors[field.key] && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{errors[field.key]}</p>}
                    </div>
                  ))
                )}
              </div>

              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>알림 설정</p>
                {[
                  { key: 'notify_all', label: '전체 알림', desc: '모든 알림을 끄거나 켜요' },
                  { key: 'notify_announcement', label: '공지사항 알림', desc: '새 공지사항이 등록될 때 알림' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 'var(--font-size)', color: 'var(--text)' }}>{item.label}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                    <Toggle value={notifySettings[item.key]} onChange={() => handleToggleNotify(item.key)} />
                  </div>
                ))}
              </div>

              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>서버 설정</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>서버 IP 주소</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={serverIp} onChange={e => setServerIp(e.target.value)} placeholder="예: 192.168.0.5"
                      style={{ flex: 1, ...inputStyle(false) }} />
                    <button onClick={handleSaveServerIp}
                      style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent-text)' }}>
                      저장
                    </button>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>변경 후 앱을 재시작해야 적용돼요</p>
                </div>
              </div>
            </>
          )}

          {/* ===== 테마 탭 ===== */}
          {activeTab === 'theme' && (
            <>
              {/* 테마 선택 */}
              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>테마</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>앱 전체 색상 테마를 선택해요</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {Object.entries(themes).map(([key, t]) => (
                    <button key={key} onClick={() => handleTheme(key)}
                      style={{ padding: '0', border: `2px solid ${currentTheme === key ? t.accent : 'transparent'}`, borderRadius: '10px', background: 'transparent', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', height: '48px' }}>
                        <div style={{ flex: 1, background: t.bg }} />
                        <div style={{ width: '40%', background: t.accent }} />
                      </div>
                      <div style={{ padding: '6px 8px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: currentTheme === key ? '500' : '400', color: currentTheme === key ? 'var(--accent)' : 'var(--text-sub)', margin: 0 }}>
                          {t.emoji} {t.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 글꼴 종류 */}
              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>글꼴</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>앱 전체 글꼴을 변경해요</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fontFamilies.map(f => (
                    <div key={f.key} onClick={() => handleFont(f.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${currentFont === f.key ? 'var(--accent)' : 'var(--border)'}`, background: currentFont === f.key ? 'var(--accent-light)' : 'var(--surface)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: currentFont === f.key ? 'var(--accent)' : 'var(--text)', margin: 0, fontFamily: f.value }}>
                          {f.label} — 가나다 ABC 123
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: 0 }}>{f.desc}</p>
                      </div>
                      {currentFont === f.key && (
                        <span style={{ fontSize: '14px', color: 'var(--accent)' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 글꼴 크기 */}
              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>글꼴 크기</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>앱 전체 글꼴 크기를 조절해요</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {fontSizes.map(s => (
                    <button key={s.key} onClick={() => handleSize(s.key)}
                      style={{ flex: 1, padding: '12px 8px', border: `2px solid ${currentSize === s.key ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '10px', background: currentSize === s.key ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: s.base, fontWeight: '500', color: currentSize === s.key ? 'var(--accent)' : 'var(--text)' }}>가</span>
                      <span style={{ fontSize: '10px', color: currentSize === s.key ? 'var(--accent)' : 'var(--text-muted)' }}>{s.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 'var(--font-size)', color: 'var(--text)', margin: 0 }}>
                    미리보기: 안녕하세요! FileSync에 오신 것을 환영해요.
                  </p>
                </div>
              </div>
              {/* 창 크기 */}
              <div style={card}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500' }}>창 크기</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>앱 창 크기를 선택해요</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { label: '소형', width: 1152, height: 720 },
                    { label: '중형', width: 1280, height: 800 },
                    { label: '대형', width: 1440, height: 900 },
                    { label: '와이드', width: 1600, height: 1000 },
                    { label: '울트라', width: 1920, height: 1080 },
                  ].map(s => (
                    <button key={s.label} onClick={() => {
                      window.electronAPI?.resizeWindow(s.width, s.height)
                      showToast(`창 크기: ${s.label} (${s.width}×${s.height})`)
                    }}
                      style={{ flex: 1, padding: '10px 6px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: 'var(--font-size)', color: 'var(--text)', fontWeight: '500' }}>{s.label}</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{s.width}×{s.height}</span>
                    </button>
                  ))}
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