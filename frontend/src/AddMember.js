import { useState } from 'react'
import { getApiUrl } from './config'

function AddMember({ onClose }) {
  const [form, setForm] = useState({ name: '', dept: '', role: '', count: 1 })
  const [created, setCreated] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)

  const handleCreate = () => {
    if (!form.name.trim() || !form.dept.trim() || !form.role.trim()) return
    setLoading(true)
    fetch(`${getApiUrl()}/users/bulk-create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, dept: form.dept, role: form.role, count: form.count })
    }).then(r => r.json()).then(data => { setCreated(data); setLoading(false) })
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const inputStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }
  const isDisabled = loading || !form.name || !form.dept || !form.role

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '24px', width: '400px', maxHeight: '80vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }}
        onClick={e => e.stopPropagation()}>

        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>👤 신규 회원 추가</p>

        {created.length === 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'name', label: '이름', placeholder: '이름 입력' },
                { key: 'dept', label: '부서', placeholder: '부서 입력' },
                { key: 'role', label: '직책', placeholder: '직책 입력' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{field.label}</label>
                  <input value={form[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>생성할 계정 수</label>
                <input type="number" min="1" max="50" value={form.count}
                  onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))}
                  style={inputStyle} />
              </div>
            </div>

            <div style={{ background: 'var(--surface-alt)', borderRadius: '8px', padding: '10px 12px' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                아이디는 이름 + 랜덤 4자리, 비밀번호는 자동 생성돼요. 첫 로그인 시 온보딩으로 연결됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
                취소
              </button>
              <button onClick={handleCreate} disabled={isDisabled}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: isDisabled ? 'var(--text-muted)' : 'var(--accent)', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>
                {loading ? '생성 중...' : '추가하기'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: 'var(--green-light)', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--green)' }}>✅ {created.length}개 계정이 생성됐어요! 아래 정보를 전달해주세요.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {created.map((account, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text)' }}>{account.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>아이디: <span style={{ color: 'var(--text)', fontWeight: '500' }}>{account.username}</span></p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>비밀번호: <span style={{ color: 'var(--text)', fontWeight: '500' }}>{account.password}</span></p>
                    </div>
                    <button onClick={() => handleCopy(`아이디: ${account.username}\n비밀번호: ${account.password}`, i)}
                      style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: copied === i ? 'var(--green-light)' : 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: copied === i ? 'var(--green)' : 'var(--text-sub)', flexShrink: 0 }}>
                      {copied === i ? '✅ 복사됨' : '복사'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onClose}
              style={{ padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AddMember