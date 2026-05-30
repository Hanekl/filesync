import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

function HRManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('accounts')
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [jobTitles, setJobTitles] = useState([])
  const [newAccounts, setNewAccounts] = useState([])
  const [createForm, setCreateForm] = useState({ customName: '', useCustomName: false, dept: '', title: '', count: 1 })

  const fetchUsers = () => {
    setLoading(true)
    fetch(`${getApiUrl()}/users/all`).then(r => r.json()).then(data => { if (Array.isArray(data)) setUsers(data) }).finally(() => setLoading(false))
  }
  const fetchDepartments = () => {
    fetch(`${getApiUrl()}/departments`).then(r => r.json()).then(data => { if (Array.isArray(data)) setDepartments(data) })
  }
  const fetchJobTitles = () => {
    fetch(`${getApiUrl()}/jobtitles`).then(r => r.json()).then(data => { if (Array.isArray(data)) setJobTitles(data) })
  }

  useEffect(() => { fetchUsers(); fetchJobTitles(); fetchDepartments() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const confirm = (msg, onConfirm) => { setConfirmModal({ msg, onConfirm }) }

  const generateAccounts = () => {
    const deptCode = createForm.dept.slice(0, 3).toLowerCase()
    const timestamp = Date.now()
    return Array.from({ length: createForm.count }, (_, i) => ({
      username: `${deptCode}${timestamp}${i + 1}`,
      password: Math.random().toString(36).slice(-8),
      name: createForm.useCustomName ? createForm.customName : `신입_${timestamp}${i + 1}`,
      dept: createForm.dept, role: createForm.title,
      grade: jobTitles.find(t => t.title === createForm.title)?.role || 'user'
    }))
  }

  const gradeColor = {
    super_admin: { bg: 'var(--accent-light)', color: 'var(--accent)' },
    user:        { bg: 'var(--surface-alt)',  color: 'var(--text-sub)' },
    guest:       { bg: '#FAEEDA',             color: '#854F0B' },
  }

  const filteredUsers = users.filter(u => u.is_active && (u.name.includes(search) || u.dept.includes(search) || u.role.includes(search)))
  const depts = [...new Set([...departments.map(d => d.name), ...users.map(u => u.dept)])]

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', marginBottom: '14px', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)' }
  const modalStyle = { background: 'var(--surface)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }

  const UserCard = ({ user, actions, onClick }) => (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--surface-alt)' }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'var(--surface)' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--accent)', flexShrink: 0 }}>
        {user.name[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{user.name}</p>
          <span style={{ fontSize: 'var(--font-size-sm)', padding: '1px 6px', borderRadius: '8px', background: gradeColor[user.grade]?.bg || 'var(--surface-alt)', color: gradeColor[user.grade]?.color || 'var(--text-sub)' }}>
            {user.grade}
          </span>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{user.dept} · {user.role}</p>
      </div>
      {actions}
    </div>
  )

  const emptyState = (text) => (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>{text}</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '10px 20px', borderRadius: '20px', fontSize: 'var(--font-size)', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...modalStyle, width: '300px' }}>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>변경 확인</p>
            <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)', lineHeight: '1.6' }}>{confirmModal.msg}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '9px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 */}
      <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>👥 인사 관리</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '180px', borderRight: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          {[
            { key: 'accounts',  label: '👤 계정 관리' },
            { key: 'promotion', label: '⬆️ 승진/권한' },
            { key: 'dept',      label: '🏢 부서 배치' },
            { key: 'resign',    label: '🚪 퇴사 처리' },
            { key: 'resigned',  label: '📁 퇴사자 목록' },
          ].map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 'var(--font-size)', background: activeTab === tab.key ? 'var(--accent-light)' : 'transparent', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-sub)', fontWeight: activeTab === tab.key ? '500' : '400', borderLeft: activeTab === tab.key ? '3px solid var(--accent)' : '3px solid transparent' }}>
              {tab.label}
            </div>
          ))}
        </div>

        {/* 오른쪽 내용 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'var(--bg)' }}>

          {activeTab !== 'dept' && (
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 부서, 직책 검색..." style={inputStyle} />
          )}

          {/* 계정 관리 */}
          {activeTab === 'accounts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>전체 {filteredUsers.length}명</p>
                <button onClick={() => setShowCreateModal(true)}
                  style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                  + 신규 계정 생성
                </button>
              </div>
              {loading ? emptyState('👥 직원 목록을 불러오는 중이에요...')
              : filteredUsers.length === 0 ? emptyState(search ? `"${search}" 검색 결과가 없어요` : '등록된 직원이 없어요')
              : depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user} onClick={() => setSelectedUser(user)}
                          actions={
                            <span style={{ fontSize: 'var(--font-size-sm)', padding: '2px 8px', borderRadius: '10px', background: user.status === 'online' ? 'var(--green-light)' : 'var(--surface-alt)', color: user.status === 'online' ? 'var(--green)' : 'var(--text-muted)' }}>
                              {user.status === 'online' ? '온라인' : '오프라인'}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 승진/권한 */}
          {activeTab === 'promotion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? emptyState('👥 불러오는 중이에요...')
              : filteredUsers.length === 0 ? emptyState(search ? `"${search}" 검색 결과가 없어요` : '등록된 직원이 없어요')
              : depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user}
                          actions={
                            <select defaultValue={user.grade}
                              style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', outline: 'none', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)' }}
                              onChange={(e) => {
                                const newGrade = e.target.value
                                confirm(`${user.name}님의 역할을 ${newGrade}로 변경할까요?`, () => {
                                  fetch(`${getApiUrl()}/users/grade/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: newGrade }) })
                                    .then(() => { fetchUsers(); showToast(`${user.name}님의 역할이 변경되었습니다!`) })
                                })
                              }}>
                              <option value="guest">외부 협력사</option>
                              <option value="user">일반 직원</option>
                              <option value="super_admin">시스템 관리자</option>
                            </select>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 부서 배치 */}
          {activeTab === 'dept' && (
            <div>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 검색..." style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {depts.map(dept => {
                  const deptUsers = users.filter(u => u.dept === dept && u.is_active && u.name.includes(search))
                  return (
                    <div key={dept} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>🏢 {dept}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{deptUsers.length}명</p>
                      </div>
                      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {deptUsers.map(user => (
                          <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-alt)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--accent)', flexShrink: 0 }}>
                              {user.name[0]}
                            </div>
                            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', flex: 1, color: 'var(--text)' }}>{user.name}</p>
                            <select defaultValue={dept}
                              style={{ padding: '3px 6px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', outline: 'none', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)' }}
                              onChange={(e) => {
                                const newDept = e.target.value
                                confirm(`${user.name}님을 ${newDept}으로 이동할까요?`, () => {
                                  fetch(`${getApiUrl()}/users/dept/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dept: newDept }) })
                                    .then(() => { fetchUsers(); showToast(`${user.name}님이 ${newDept}으로 이동되었습니다!`) })
                                })
                              }}>
                              {depts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 퇴사 처리 */}
          {activeTab === 'resign' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: 'var(--red-light)', border: '1px solid var(--red)', borderRadius: '10px', padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--red)', marginBottom: '4px' }}>
                ⚠️ 퇴사 처리된 계정은 로그인이 불가능해요. 신중하게 진행해주세요.
              </div>
              {loading ? emptyState('👥 불러오는 중이에요...')
              : filteredUsers.length === 0 ? emptyState(search ? `"${search}" 검색 결과가 없어요` : '등록된 직원이 없어요')
              : depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept && u.id !== currentUser.id)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user}
                          actions={
                            <button onClick={() => confirm(`${user.name}님을 퇴사 처리할까요?`, () => {
                              fetch(`${getApiUrl()}/users/resign/${user.id}`, { method: 'PUT' })
                                .then(() => { fetchUsers(); showToast(`${user.name}님이 퇴사 처리되었습니다.`) })
                            })} style={{ padding: '5px 12px', border: '1px solid var(--red)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>
                              퇴사
                            </button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 퇴사자 목록 */}
          {activeTab === 'resigned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>퇴사자 목록</p>
              {users.filter(u => !u.is_active).length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>
                  퇴사자가 없어요
                </div>
              ) : users.filter(u => !u.is_active).map(user => (
                <div key={user.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size)', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {user.name[0] || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text-sub)' }}>{user.name || '이름 없음'}</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{user.dept} · {user.role}</p>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-sm)', padding: '2px 8px', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>퇴사</span>
                  <button onClick={() => confirm(`${user.name}님의 계정을 완전히 삭제할까요?\n복구가 불가능해요!`, () => {
                    fetch(`${getApiUrl()}/users/delete/${user.id}`, { method: 'DELETE' })
                      .then(() => { fetchUsers(); showToast(`${user.name}님의 계정이 삭제되었습니다.`) })
                  })} style={{ padding: '4px 10px', border: '1px solid var(--red)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>
                    완전 삭제
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* 계정 상세 모달 */}
        {selectedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedUser(null)}>
            <div style={{ ...modalStyle, width: '340px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '500', color: 'var(--accent)' }}>
                  {selectedUser.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>{selectedUser.name}</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{selectedUser.dept} · {selectedUser.role}</p>
                </div>
              </div>
              <div style={{ height: '1px', background: 'var(--border)' }} />
              {[
                { label: '아이디', value: selectedUser.username },
                { label: '부서', value: selectedUser.dept },
                { label: '직책', value: selectedUser.role },
                { label: '역할', value: selectedUser.grade },
                { label: '상태', value: selectedUser.status === 'online' ? '🟢 온라인' : selectedUser.status === 'away' ? '🟡 자리비움' : '⚫ 오프라인' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
              <button onClick={() => {
                const newPw = Math.random().toString(36).slice(-8)
                confirm(`${selectedUser.name}님의 임시 비밀번호를 발급할까요?`, () => {
                  fetch(`${getApiUrl()}/users/reset-password/${selectedUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: newPw }) })
                    .then(() => { showToast(`임시 비밀번호: ${newPw}`); setSelectedUser(null) })
                })
              }} style={{ padding: '10px', border: '1px solid var(--accent)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent)' }}>
                임시 비밀번호 발급
              </button>
              <button onClick={() => setSelectedUser(null)}
                style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 신규 계정 생성 모달 */}
        {showCreateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ ...modalStyle, width: '400px', maxHeight: '80vh', overflow: 'auto' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>신규 계정 생성</p>
              {newAccounts.length === 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="customName" checked={createForm.useCustomName}
                          onChange={e => setCreateForm(prev => ({ ...prev, useCustomName: e.target.checked, customName: '' }))} />
                        <label htmlFor="customName" style={{ fontSize: 'var(--font-size)', cursor: 'pointer', color: 'var(--text)' }}>이름 직접 입력</label>
                      </div>
                      {createForm.useCustomName && (
                        <input value={createForm.customName} onChange={e => setCreateForm(prev => ({ ...prev, customName: e.target.value }))}
                          placeholder="이름 입력 (여러 계정이면 공통 이름)"
                          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>부서</label>
                      <select value={createForm.dept} onChange={(e) => setCreateForm(prev => ({ ...prev, dept: e.target.value, title: '' }))}
                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}>
                        <option value="">부서 선택</option>
                        {departments.map(d => <option key={d.key} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>직책</label>
                      <select value={createForm.title} onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}>
                        <option value="">직책 선택</option>
                        {jobTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>생성할 계정 수</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCreateForm(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                          style={{ width: '32px', height: '32px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>-</button>
                        <input type="number" min="1" max="50" value={createForm.count}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, count: Math.max(1, parseInt(e.target.value) || 1) }))}
                          style={{ width: '60px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }} />
                        <button onClick={() => setCreateForm(prev => ({ ...prev, count: Math.min(50, prev.count + 1) }))}
                          style={{ width: '32px', height: '32px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>+</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      아이디와 임시 비밀번호는 자동으로 생성돼요. 생성 후 직원에게 전달해주세요.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setShowCreateModal(false); setCreateForm({ dept: '', title: '', count: 1 }) }}
                      style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
                    <button onClick={() => {
                      if (!createForm.dept) { alert('부서를 선택해주세요!'); return }
                      if (!createForm.title) { alert('직책을 선택해주세요!'); return }
                      setNewAccounts(generateAccounts())
                    }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>생성하기</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>생성된 계정 {newAccounts.length}개예요. 직원에게 전달해주세요!</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newAccounts.map((acc, i) => (
                      <div key={i} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text)' }}>계정 {i + 1}</p>
                        {[
                          { label: `아이디: `, value: acc.username },
                          { label: `임시 비밀번호: `, value: acc.password },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{item.label}<strong style={{ color: 'var(--text)' }}>{item.value}</strong></p>
                            <button onClick={() => { navigator.clipboard.writeText(item.value); showToast('복사됨!') }}
                              style={{ padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>복사</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>부서: {acc.dept} / 직책: {acc.role}</p>
                          <button onClick={() => { navigator.clipboard.writeText(`아이디: ${acc.username}\n비밀번호: ${acc.password}`); showToast('전체 복사됨!') }}
                            style={{ padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>전체복사</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setNewAccounts([])}
                      style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>다시 만들기</button>
                    <button onClick={() => {
                      Promise.all(newAccounts.map(acc => fetch(`${getApiUrl()}/users/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(acc) })))
                        .then(() => { fetchUsers(); setShowCreateModal(false); setNewAccounts([]); setCreateForm({ dept: '', title: '', count: 1 }) })
                    }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>확정하기</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HRManagement