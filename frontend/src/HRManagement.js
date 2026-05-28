import { useState, useEffect } from 'react'
import { getApiUrl} from './config'

function HRManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('accounts')
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)

  const fetchDepartments = () => {
    fetch(`${getApiUrl()}/departments`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDepartments(data) })
  }

  const fetchJobTitles = () => {
    fetch(`${getApiUrl()}/jobtitles`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setJobTitles(data) })
  }

  const generateAccounts = () => {
    const deptCode = createForm.dept.slice(0, 3).toLowerCase()
    const timestamp = Date.now()
    return Array.from({ length: createForm.count }, (_, i) => ({
      username: `${deptCode}${timestamp}${i + 1}`,
      password: Math.random().toString(36).slice(-8),
      name: createForm.useCustomName ? createForm.customName : `신입_${timestamp}${i + 1}`,
      dept: createForm.dept,
      role: createForm.title,
      grade: jobTitles.find(t => t.title === createForm.title)?.role || 'member'
    }))
  }

  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [jobTitles, setJobTitles] = useState([])
  const [newAccounts, setNewAccounts] = useState([])
  const [createForm, setCreateForm] = useState({
    customName: '',
    useCustomName: false,
    dept: '',
    title: '',
    count: 1,
  })

  const fetchUsers = () => {
    fetch(`${getApiUrl()}/users/all`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
  }

useEffect(() => { fetchUsers(); fetchJobTitles(); fetchDepartments() }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const confirm = (msg, onConfirm) => {
    setConfirmModal({ msg, onConfirm })
  }

  const gradeColor = {
    super_admin: { bg: '#EEEDFE', color: '#3C3489' },
    admin: { bg: '#FAECE7', color: '#993C1D' },
    manager: { bg: '#E1F5EE', color: '#085041' },
    member: { bg: '#f0f0f0', color: '#555' },
    guest: { bg: '#FAEEDA', color: '#854F0B' },
  }

  const filteredUsers = users.filter(u =>
    u.is_active &&
    (u.name.includes(search) || u.dept.includes(search) || u.role.includes(search))
  )

  const depts = [...new Set([
    ...departments.map(d => d.name),
    ...users.map(u => u.dept)
  ])]

  // 유저 카드 컴포넌트
const UserCard = ({ user, actions, onClick }) => (
  <div onClick={onClick} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: onClick ? 'pointer' : 'default' }}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = '#f8f8f8' }}
    onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'white' }}
  >
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', color: '#3C3489', flexShrink: 0 }}>
        {user.name[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500' }}>{user.name}</p>
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: gradeColor[user.grade]?.bg, color: gradeColor[user.grade]?.color }}>
            {user.grade}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#aaa' }}>{user.dept} · {user.role}</p>
      </div>
      {actions}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 토스트 메시지 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>변경 확인</p>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>{confirmModal.msg}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '9px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                취소
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>👥 인사 관리</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '180px', borderRight: '1px solid #eee', background: 'white', flexShrink: 0 }}>
          {[
            { key: 'accounts', label: '👤 계정 관리' },
            { key: 'promotion', label: '⬆️ 승진/권한' },
            { key: 'dept', label: '🏢 부서 배치' },
            { key: 'resign', label: '🚪 퇴사 처리' },
            { key: 'resigned', label: '📁 퇴사자 목록' },
          ].map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '13px', background: activeTab === tab.key ? '#f0effe' : 'transparent', color: activeTab === tab.key ? '#534AB7' : '#555', fontWeight: activeTab === tab.key ? '500' : '400', borderLeft: activeTab === tab.key ? '3px solid #534AB7' : '3px solid transparent' }}>
              {tab.label}
            </div>
          ))}
        </div>

        {/* 오른쪽 내용 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#f8f8f8' }}>

          {/* 검색창 (부서 배치 제외) */}
          {activeTab !== 'dept' && (
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 부서, 직책 검색..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }}
            />
          )}

          {/* 계정 관리 */}
          {activeTab === 'accounts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <p style={{ fontSize: '13px', color: '#888' }}>전체 {filteredUsers.length}명</p>
                <button onClick={() => setShowCreateModal(true)}
                  style={{ padding: '7px 14px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  + 신규 계정 생성
                </button>
              </div>
              {depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: '11px', color: '#aaa', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user}
                          onClick={() => setSelectedUser(user)}
                          actions={
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: user.status === 'online' ? '#EAF3DE' : '#f0f0f0', color: user.status === 'online' ? '#3B6D11' : '#888' }}>
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
              {depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: '11px', color: '#aaa', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user}
                          actions={
                            <select defaultValue={user.grade}
                              style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                              onChange={(e) => {
                                const newGrade = e.target.value
                                confirm(`${user.name}님의 역할을 ${newGrade}로 변경할까요?`, () => {
                                  fetch(`${getApiUrl()}/users/grade/${user.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ grade: newGrade })
                                  }).then(() => { fetchUsers(); showToast(`${user.name}님의 역할이 변경되었습니다!`) })
                                })
                              }}
                            >
                              <option value="guest">외부 협력사</option>
                              <option value="member">일반 직원</option>
                              <option value="manager">부서 관리자</option>
                              <option value="admin">관리자</option>
                              <option value="super_admin">최고 관리자</option>
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
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 검색..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {depts.map(dept => {
                  const deptUsers = users.filter(u => u.dept === dept && u.is_active && u.name.includes(search))
                  return (
                    <div key={dept} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
                        <p style={{ fontSize: '13px', fontWeight: '500' }}>🏢 {dept}</p>
                        <p style={{ fontSize: '11px', color: '#aaa' }}>{deptUsers.length}명</p>
                      </div>
                      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {deptUsers.map(user => (
                          <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: '#f8f8f8' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#3C3489', flexShrink: 0 }}>
                              {user.name[0]}
                            </div>
                            <p style={{ fontSize: '12px', fontWeight: '500', flex: 1 }}>{user.name}</p>
                            <select
                              defaultValue={dept}
                              style={{ padding: '3px 6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
                              onChange={(e) => {
                                const newDept = e.target.value
                                confirm(`${user.name}님을 ${newDept}으로 이동할까요?`, () => {
                                  fetch(`${getApiUrl()}/users/dept/${user.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ dept: newDept })
                                  }).then(() => { fetchUsers(); showToast(`${user.name}님이 ${newDept}으로 이동되었습니다!`) })
                                })
                              }}
                            >
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
              <div style={{ background: '#FAECE7', border: '1px solid #F5C4B3', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#993C1D', marginBottom: '4px' }}>
                ⚠️ 퇴사 처리된 계정은 로그인이 불가능해요. 신중하게 진행해주세요.
              </div>
              {depts.map(dept => {
                const deptUsers = filteredUsers.filter(u => u.dept === dept && u.id !== currentUser.id)
                if (deptUsers.length === 0) return null
                return (
                  <div key={dept}>
                    <p style={{ fontSize: '11px', color: '#aaa', fontWeight: '500', padding: '8px 4px 4px' }}>{dept}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptUsers.map(user => (
                        <UserCard key={user.id} user={user}
                          actions={
                            <button
                              onClick={() => confirm(`${user.name}님을 퇴사 처리할까요?`, () => {
                                fetch(`${getApiUrl()}/users/resign/${user.id}`, { method: 'PUT' })
                                  .then(() => { fetchUsers(); showToast(`${user.name}님이 퇴사 처리되었습니다.`) })
                              })}
                              style={{ padding: '5px 12px', border: '1px solid #e53e3e', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#e53e3e' }}>
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
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>퇴사자 목록</p>
                    {users.filter(u => !u.is_active).length === 0 ? (
                      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                        퇴사자가 없어요
                      </div>
                    ) : (
                      users.filter(u => !u.is_active).map(user => (
                        <div key={user.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#aaa', flexShrink: 0 }}>
                            {user.name[0] || '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: '500', color: '#888' }}>{user.name || '이름 없음'}</p>
                            <p style={{ fontSize: '11px', color: '#aaa' }}>{user.dept} · {user.role}</p>
                          </div>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#f0f0f0', color: '#aaa' }}>퇴사</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#f0f0f0', color: '#aaa' }}>퇴사</span>
                          <button
                            onClick={() => confirm(`${user.name}님의 계정을 완전히 삭제할까요?\n복구가 불가능해요!`, () => {
                              fetch(`${getApiUrl()}/users/delete/${user.id}`, { method: 'DELETE' })
                                .then(() => { fetchUsers(); showToast(`${user.name}님의 계정이 삭제되었습니다.`) })
                            })}
                            style={{ padding: '4px 10px', border: '1px solid #e53e3e', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#e53e3e' }}>
                            완전 삭제
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

        </div>

        {/* 계정 상세 정보 모달 */}
        {selectedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedUser(null)}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              onClick={(e) => e.stopPropagation()}>
              
              {/* 아바타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '500', color: '#3C3489' }}>
                  {selectedUser.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '500' }}>{selectedUser.name}</p>
                  <p style={{ fontSize: '12px', color: '#aaa' }}>{selectedUser.dept} · {selectedUser.role}</p>
                </div>
              </div>

              <div style={{ height: '1px', background: '#eee' }} />

              {/* 상세 정보 */}
              {[
                { label: '아이디', value: selectedUser.username },
                { label: '부서', value: selectedUser.dept },
                { label: '직책', value: selectedUser.role },
                { label: '역할', value: selectedUser.grade },
                { label: '상태', value: selectedUser.status === 'online' ? '🟢 온라인' : selectedUser.status === 'away' ? '🟡 자리비움' : '⚫ 오프라인' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{item.value}</span>
                </div>
              ))}

                <button
                  onClick={() => {
                    const newPw = Math.random().toString(36).slice(-8)
                    confirm(`${selectedUser.name}님의 임시 비밀번호를 발급할까요?`, () => {
                      fetch(`${getApiUrl()}/users/reset-password/${selectedUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ new_password: newPw })
                      }).then(() => {
                        showToast(`임시 비밀번호: ${newPw}`)
                        setSelectedUser(null)
                      })
                    })
                  }}
                  style={{ padding: '10px', border: '1px solid #534AB7', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#534AB7' }}>
                  임시 비밀번호 발급
                </button>
                <button onClick={() => setSelectedUser(null)}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                  닫기
                </button>
            </div>
          </div>
        )}

        {/* 신규 계정 생성 모달 */}
        {showCreateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '80vh', overflow: 'auto' }}>
              <p style={{ fontSize: '15px', fontWeight: '500' }}>신규 계정 생성</p>

              {newAccounts.length === 0 ? (
                <>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!createForm.dept) { alert('부서를 선택해주세요!'); return }
                      if (!createForm.title) { alert('직책을 선택해주세요!'); return }
                      setNewAccounts(generateAccounts())
                    }
                  }}
                >
                  {/* 이름 직접 입력 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: '#f8f8f8', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="customName" checked={createForm.useCustomName}
                        onChange={e => setCreateForm(prev => ({ ...prev, useCustomName: e.target.checked, customName: '' }))} />
                      <label htmlFor="customName" style={{ fontSize: '13px', cursor: 'pointer' }}>이름 직접 입력</label>
                    </div>
                    {createForm.useCustomName && (
                      <input
                        value={createForm.customName}
                        onChange={e => setCreateForm(prev => ({ ...prev, customName: e.target.value }))}
                        placeholder="이름 입력 (여러 계정이면 공통 이름)"
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>부서</label>
                      <select value={createForm.dept}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, dept: e.target.value, title: '' }))}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
                        <option value="">부서 선택</option>
                        {departments.map(d => (
                          <option key={d.key} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#888' }}>직책</label>
                      <select value={createForm.title}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
                        <option value="">직책 선택</option>
                        {jobTitles.map(t => (
                          <option key={t.id} value={t.title}>{t.title} ({t.role})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#888' }}>생성할 계정 수</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setCreateForm(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                          style={{ width: '32px', height: '32px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>
                          -
                        </button>
                        <input type="number" min="1" max="50" value={createForm.count}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, count: Math.max(1, parseInt(e.target.value) || 1) }))}
                          style={{ width: '60px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', textAlign: 'center' }} />
                        <button
                          onClick={() => setCreateForm(prev => ({ ...prev, count: Math.min(50, prev.count + 1) }))}
                          style={{ width: '32px', height: '32px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>
                      아이디와 임시 비밀번호는 자동으로 생성돼요. 생성 후 직원에게 전달해주세요.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setShowCreateModal(false); setCreateForm({ dept: '', title: '', count: 1 }) }}
                      style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                      취소
                    </button>
                    <button
                      onClick={() => {
                        if (!createForm.dept) { alert('부서를 선택해주세요!'); return }
                        if (!createForm.title) { alert('직책을 선택해주세요!'); return }
                        setNewAccounts(generateAccounts())
                      }}
                      style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                      생성하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: '#555' }}>생성된 계정 {newAccounts.length}개예요. 직원에게 전달해주세요!</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newAccounts.map((acc, i) => (
                      <div key={i} style={{ background: '#f8f8f8', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '500' }}>계정 {i + 1}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: '11px', color: '#555' }}>아이디: <strong>{acc.username}</strong></p>
                          <button onClick={() => { navigator.clipboard.writeText(acc.username); showToast('아이디 복사됨!') }}
                            style={{ padding: '2px 8px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '10px', color: '#534AB7' }}>
                            복사
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: '11px', color: '#555' }}>임시 비밀번호: <strong>{acc.password}</strong></p>
                          <button onClick={() => { navigator.clipboard.writeText(acc.password); showToast('비밀번호 복사됨!') }}
                            style={{ padding: '2px 8px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '10px', color: '#534AB7' }}>
                            복사
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: '11px', color: '#555' }}>부서: {acc.dept} / 직책: {acc.role}</p>
                          <button onClick={() => {
                            navigator.clipboard.writeText(`아이디: ${acc.username}\n비밀번호: ${acc.password}`)
                            showToast('전체 복사됨!')
                          }}
                            style={{ padding: '2px 8px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '10px', color: '#888' }}>
                            전체복사
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setNewAccounts([])}
                      style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                      다시 만들기
                    </button>
                    <button
                      onClick={() => {
                        Promise.all(newAccounts.map(acc =>
                          fetch(`${getApiUrl()}/users/create`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(acc)
                          })
                        )).then(() => {
                          fetchUsers()
                          setShowCreateModal(false)
                          setNewAccounts([])
                          setCreateForm({ dept: '', title: '', count: 1 })
                        })
                      }}
                      style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                      확정하기
                    </button>
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