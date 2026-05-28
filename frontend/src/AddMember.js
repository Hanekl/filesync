import { useState } from 'react'
import { getApiUrl} from './config'

function AddMember({ onClose }) {
  const [form, setForm] = useState({ name: '', dept: '', role: '', count: 1 })
  const [created, setCreated] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)

  const handleCreate = () => {
    if (!form.name.trim() || !form.dept.trim() || !form.role.trim()) return
    setLoading(true)
    fetch(`${getApiUrl()}/users/bulk-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, dept: form.dept, role: form.role, count: form.count })
    }).then(r => r.json())
      .then(data => { setCreated(data); setLoading(false) })
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px', maxHeight: '80vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
        onClick={e => e.stopPropagation()}>

        <p style={{ fontSize: '15px', fontWeight: '500' }}>👤 신규 회원 추가</p>

        {created.length === 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'name', label: '이름', placeholder: '이름 입력' },
                { key: 'dept', label: '부서', placeholder: '부서 입력' },
                { key: 'role', label: '직책', placeholder: '직책 입력' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#888' }}>{field.label}</label>
                  <input value={form[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>생성할 계정 수</label>
                <input type="number" min="1" max="50" value={form.count}
                  onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))}
                  style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '10px 12px' }}>
              <p style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>
                아이디는 이름 + 랜덤 4자리, 비밀번호는 자동 생성돼요. 첫 로그인 시 온보딩으로 연결됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                취소
              </button>
              <button onClick={handleCreate} disabled={loading || !form.name || !form.dept || !form.role}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: (!form.name || !form.dept || !form.role) ? '#ccc' : '#534AB7', cursor: (!form.name || !form.dept || !form.role) ? 'not-allowed' : 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                {loading ? '생성 중...' : '추가하기'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: '#E1F5EE', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: '12px', color: '#085041' }}>✅ {created.length}개 계정이 생성됐어요! 아래 정보를 전달해주세요.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {created.map((account, i) => (
                <div key={i} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{account.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#888' }}>아이디: <span style={{ color: '#333', fontWeight: '500' }}>{account.username}</span></p>
                      <p style={{ fontSize: '11px', color: '#888' }}>비밀번호: <span style={{ color: '#333', fontWeight: '500' }}>{account.password}</span></p>
                    </div>
                    <button
                      onClick={() => handleCopy(`아이디: ${account.username}\n비밀번호: ${account.password}`, i)}
                      style={{ padding: '4px 10px', border: '1px solid #ddd', borderRadius: '6px', background: copied === i ? '#E1F5EE' : 'white', cursor: 'pointer', fontSize: '11px', color: copied === i ? '#085041' : '#555', flexShrink: 0 }}>
                      {copied === i ? '✅ 복사됨' : '복사'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onClose}
              style={{ padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AddMember