import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

function SystemSettings({ currentUser }) {
  const [activeTab, setActiveTab] = useState('roles')
  const [departments, setDepartments] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [deptError, setDeptError] = useState('')
  const [roleNames, setRoleNames] = useState({})
  const [jobTitles, setJobTitles] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newTitleRole, setNewTitleRole] = useState('member')
  const [titleError, setTitleError] = useState('')
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showTitleModal, setShowTitleModal] = useState(false)

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

    const fetchRoles = () => {
    fetch(`${getApiUrl()}/roles`)
        .then(r => r.json())
        .then(data => {
        if (Array.isArray(data)) {
            const names = {}
            data.forEach(r => { names[r.role_key] = r.display_name })
            setRoleNames(names)
        }
        })
    }

useEffect(() => {
  fetch(`${getApiUrl()}/roles/init`, { method: 'POST' })
    .then(() => fetchRoles())
  fetchDepartments()
  fetchJobTitles()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  

  const handleCreateDept = () => {
    if (!newDeptName.trim()) { setDeptError('부서명을 입력해주세요!'); return }
    const autoKey = `dept_${Date.now()}`
    fetch(`${getApiUrl()}/departments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: autoKey, name: newDeptName })
    })
      .then(r => r.json())
      .then(() => {
        fetchDepartments()
        setNewDeptName('')
        setDeptError('')
        setShowDeptModal(false)
      })
  }

  const handleCreateTitle = () => {
  if (!newTitle.trim()) { setTitleError('직책명을 입력해주세요!'); return }
  fetch(`${getApiUrl()}/jobtitles/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: newTitle, role: newTitleRole })
  }).then(() => {
    fetchJobTitles()
    setNewTitle('')
    setTitleError('')
    setShowTitleModal(false)
  })
}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 상단 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>⚙️ 시스템 설정</p>
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>super_admin 전용 설정 페이지</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '180px', borderRight: '1px solid #eee', background: 'white', flexShrink: 0 }}>
          {[
            { key: 'roles', label: '👥 역할 관리' },
            { key: 'departments', label: '🏢 부서 관리' },
            { key: 'jobtitles', label: '💼 직책 관리' },
            { key: 'permissions', label: '🔒 권한 설정' },
          ].map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '13px', background: activeTab === tab.key ? '#f0effe' : 'transparent', color: activeTab === tab.key ? '#534AB7' : '#555', fontWeight: activeTab === tab.key ? '500' : '400', borderLeft: activeTab === tab.key ? '3px solid #534AB7' : '3px solid transparent' }}>
              {tab.label}
            </div>
          ))}
        </div>

        {/* 오른쪽 내용 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#f8f8f8' }}>

          {/* 역할 관리 */}
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>역할 표시 이름 설정</p>
              {Object.entries(roleNames).map(([key, name]) => (
                <div key={key} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace', width: '100px', flexShrink: 0 }}>{key}</span>
                  <input
                    value={name}
                    onChange={(e) => setRoleNames(prev => ({ ...prev, [key]: e.target.value }))}
                    disabled={key === 'guest'}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', outline: 'none', background: key === 'guest' ? '#f8f8f8' : 'white', color: key === 'guest' ? '#aaa' : '#333' }}
                  />
                  {key === 'guest' && <span style={{ fontSize: '11px', color: '#aaa' }}>변경 불가</span>}
                </div>
              ))}
              <button
                onClick={() => {
                Promise.all(
                    Object.entries(roleNames)
                    .filter(([key]) => key !== 'guest')
                    .map(([key, name]) =>
                        fetch(`${getApiUrl()}/roles/${key}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ display_name: name })
                        })
                    )
                ).then(() => alert('저장되었습니다!'))
                }}
                style={{ padding: '10px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                저장하기
              </button>
            </div>
          )}

          {/* 부서 관리 */}
          {activeTab === 'departments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>부서 관리</p>
                <button onClick={() => setShowDeptModal(true)}
                  style={{ padding: '7px 14px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  + 부서 추가
                </button>
              </div>

              {/* 부서 목록 */}
              {departments.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                  아직 추가된 부서가 없어요
                </div>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace', width: '120px', flexShrink: 0 }}>{dept.key}</span>
                    <p style={{ fontSize: '13px', fontWeight: '500', flex: 1 }}>{dept.name}</p>
                    <button
                      onClick={() => {
                        if (window.confirm(`${dept.name} 부서를 삭제할까요?`)) {
                          fetch(`${getApiUrl()}/departments/${dept.key}`, { method: 'DELETE' })
                            .then(() => fetchDepartments())
                        }
                      }}
                      style={{ padding: '4px 10px', border: '1px solid #e53e3e', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#e53e3e' }}>
                      삭제
                    </button>
                  </div>
                ))
              )}

              {/* 부서 추가 모달 */}
              {showDeptModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '500' }}>새 부서 추가</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#888' }}>부서명</label>
                        <input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDept() }}
                          placeholder="예: 개발팀"
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                      </div>
                      {deptError && <p style={{ fontSize: '11px', color: '#e53e3e' }}>{deptError}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowDeptModal(false); setNewDeptName(''); setDeptError('') }}
                        style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                        취소
                      </button>
                      <button onClick={handleCreateDept}
                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                        추가하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 직책 관리 */}
          {activeTab === 'jobtitles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>직책 관리</p>
                <button onClick={() => setShowTitleModal(true)}
                  style={{ padding: '7px 14px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  + 직책 추가
                </button>
              </div>

              {/* 직책 목록 */}
              {jobTitles.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                  아직 추가된 직책이 없어요
                </div>
              ) : (
                jobTitles.map(title => (
                  <div key={title.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', flex: 1 }}>{title.title}</p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#f0f0f0', color: '#555' }}>{title.role}</span>
                    <button
                      onClick={() => {
                        fetch(`${getApiUrl()}/jobtitles/${title.id}`, { method: 'DELETE' })
                          .then(() => fetchJobTitles())
                      }}
                      style={{ padding: '4px 10px', border: '1px solid #e53e3e', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#e53e3e' }}>
                      삭제
                    </button>
                  </div>
                ))
              )}

              {/* 직책 추가 모달 */}
              {showTitleModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '500' }}>새 직책 추가</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#888' }}>직책명</label>
                        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTitle() }}
                          placeholder="예: 팀장, 부장, 사원"
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: '#888' }}>연결 역할</label>
                        <select value={newTitleRole} onChange={(e) => setNewTitleRole(e.target.value)}
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
                          <option value="member">일반 직원</option>
                          <option value="manager">부서 관리자</option>
                          <option value="admin">관리자</option>
                          <option value="super_admin">최고 관리자</option>
                        </select>
                      </div>
                      {titleError && <p style={{ fontSize: '11px', color: '#e53e3e' }}>{titleError}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowTitleModal(false); setNewTitle(''); setTitleError('') }}
                        style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                        취소
                      </button>
                      <button onClick={handleCreateTitle}
                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                        추가하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 권한 설정 */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>역할별 권한 설정</p>
              <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                🔒 백엔드 연결 후 활성화됩니다
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SystemSettings