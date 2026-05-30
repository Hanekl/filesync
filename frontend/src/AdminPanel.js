import { useState, useEffect, useCallback } from 'react'

const PERMISSION_TAGS = [
  { tag_key: 'basic',                display_name: '기본 기능' },
  { tag_key: 'file_permanent_delete',display_name: '파일 영구 삭제' },
  { tag_key: 'file_classify',        display_name: '파일 분류' },
  { tag_key: 'file_manage',          display_name: '파일 관리 탭' },
  { tag_key: 'announce_write',       display_name: '공지 작성' },
  { tag_key: 'room_create',          display_name: '협업방 생성' },
  { tag_key: 'room_delete',          display_name: '협업방 삭제' },
  { tag_key: 'member_manage',        display_name: '인사 관리' },
  { tag_key: 'member_add',           display_name: '회원 추가' },
  { tag_key: 'system_setting',       display_name: '시스템 설정' },
]

const TAB_PERMISSIONS = [
  { tab: '내 워크스페이스', permission: null,            desc: '모든 유저 접근 가능' },
  { tab: '메신저',          permission: null,            desc: '모든 유저 접근 가능' },
  { tab: '서버 저장소',     permission: 'basic',         desc: 'basic 권한 필요' },
  { tab: '인사 관리',       permission: 'member_manage', desc: 'member_manage 권한 필요' },
  { tab: '파일 관리',       permission: 'file_manage',   desc: 'file_manage 권한 필요' },
  { tab: '시스템 설정',     permission: 'system_setting',desc: 'super_admin 또는 system_setting 권한' },
]

const c = {
  bg: '#1a1a2e', card: '#16213e', border: '#0f3460',
  text: '#e0e0e0', sub: '#8892a4', accent: '#534AB7',
  green: '#1D9E75', yellow: '#f6c90e', red: '#e53e3e',
}

const cardStyle = { background: c.card, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }
const labelStyle = { fontSize: '10px', color: c.sub, marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }

function AdminPanel({ currentUser, apiUrl }) {
  const [activeTab, setActiveTab] = useState('status')
  const [status, setStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateContent, setUpdateContent] = useState('')
  const [updateSaving, setUpdateSaving] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')
  const [updateLogs, setUpdateLogs] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [orphans, setOrphans] = useState(null)
  const [oldTrash, setOldTrash] = useState(null)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbMsg, setDbMsg] = useState('')
  const [browserFiles, setBrowserFiles] = useState([])
  const [browserLoading, setBrowserLoading] = useState(false)
  const [browserMsg, setBrowserMsg] = useState('')
  const [fileLogs, setFileLogs] = useState([])
  const [loginLogs, setLoginLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logTab, setLogTab] = useState('files')

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try { const res = await fetch(`${apiUrl}/admin/status`); setStatus(await res.json()) } catch { setStatus(null) }
    setStatusLoading(false)
  }, [apiUrl])

  const fetchUpdateLogs = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/announcements`)
      const data = await res.json()
      if (Array.isArray(data)) setUpdateLogs(data.filter(a => a.title.startsWith('[업데이트]')).slice(0, 10))
    } catch {}
  }, [apiUrl])

  const fetchAllUsers = useCallback(async () => {
    setUsersLoading(true)
    try { const res = await fetch(`${apiUrl}/admin/users`); const data = await res.json(); if (Array.isArray(data)) setAllUsers(data) } catch {}
    setUsersLoading(false)
  }, [apiUrl])

  const fetchDbInfo = useCallback(async () => {
    setDbLoading(true)
    try {
      const [o, t] = await Promise.all([
        fetch(`${apiUrl}/admin/orphan-files`).then(r => r.json()),
        fetch(`${apiUrl}/admin/old-trash`).then(r => r.json()),
      ])
      setOrphans(o); setOldTrash(t)
    } catch {}
    setDbLoading(false)
  }, [apiUrl])

  const fetchBrowserFiles = useCallback(async () => {
    setBrowserLoading(true)
    try { const res = await fetch(`${apiUrl}/admin/file-browser`); const data = await res.json(); setBrowserFiles(data.files || []) } catch {}
    setBrowserLoading(false)
  }, [apiUrl])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const [fl, ll] = await Promise.all([
        fetch(`${apiUrl}/admin/logs/files`).then(r => r.json()),
        fetch(`${apiUrl}/admin/logs/logins`).then(r => r.json()),
      ])
      if (Array.isArray(fl)) setFileLogs(fl)
      if (Array.isArray(ll)) setLoginLogs(ll)
    } catch {}
    setLogsLoading(false)
  }, [apiUrl])

  useEffect(() => {
    fetchStatus(); fetchUpdateLogs()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchStatus, fetchUpdateLogs])

  useEffect(() => {
    if (activeTab === 'accounts') fetchAllUsers()
    if (activeTab === 'db') fetchDbInfo()
    if (activeTab === 'browser') fetchBrowserFiles()
    if (activeTab === 'logs') fetchLogs()
  }, [activeTab, fetchAllUsers, fetchDbInfo, fetchBrowserFiles, fetchLogs])

  const handlePostUpdate = async () => {
    if (!updateTitle.trim() || !updateContent.trim()) { setUpdateMsg('제목과 내용을 입력해주세요'); return }
    setUpdateSaving(true)
    try {
      await fetch(`${apiUrl}/announcements/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `[업데이트] ${updateTitle}`, content: updateContent, author_id: currentUser.id, is_urgent: false })
      })
      setUpdateMsg('✅ 등록되었어요!'); setUpdateTitle(''); setUpdateContent(''); fetchUpdateLogs()
    } catch { setUpdateMsg('❌ 등록에 실패했어요') }
    setUpdateSaving(false); setTimeout(() => setUpdateMsg(''), 3000)
  }

  const handleDeleteOrphans = async () => {
    if (!window.confirm('고아 파일을 모두 삭제할까요?')) return
    try { const res = await fetch(`${apiUrl}/admin/orphan-files`, { method: 'DELETE' }); const data = await res.json(); setDbMsg(`✅ ${data.message}`); fetchDbInfo() }
    catch { setDbMsg('❌ 삭제 실패') }
    setTimeout(() => setDbMsg(''), 3000)
  }

  const handleDeleteOldTrash = async () => {
    if (!window.confirm('30일 이상된 휴지통 파일을 모두 삭제할까요?')) return
    try { const res = await fetch(`${apiUrl}/admin/old-trash`, { method: 'DELETE' }); const data = await res.json(); setDbMsg(`✅ ${data.message}`); fetchDbInfo() }
    catch { setDbMsg('❌ 삭제 실패') }
    setTimeout(() => setDbMsg(''), 3000)
  }

  const handleDeleteBrowserFile = async (storedName) => {
    if (!window.confirm(`${storedName} 파일을 삭제할까요?`)) return
    try { const res = await fetch(`${apiUrl}/admin/file-browser/${storedName}`, { method: 'DELETE' }); const data = await res.json(); setBrowserMsg(`✅ ${data.message}`); fetchBrowserFiles() }
    catch { setBrowserMsg('❌ 삭제 실패') }
    setTimeout(() => setBrowserMsg(''), 3000)
  }

  const tabStyle = (key) => ({
    padding: '8px 10px', border: 'none',
    background: activeTab === key ? c.accent : 'transparent',
    color: activeTab === key ? 'white' : c.sub,
    fontSize: '11px', cursor: 'pointer', borderRadius: '6px',
    fontWeight: activeTab === key ? '600' : '400', width: '100%', textAlign: 'left',
  })

  const filteredUsers = allUsers.filter(u => u.name?.includes(userSearch) || u.dept?.includes(userSearch) || u.username?.includes(userSearch))
  const gradeColor = (grade) => grade === 'super_admin' ? c.red : grade === 'guest' ? c.yellow : c.green
  const statusColor = (s) => s === 'online' ? c.green : s === 'away' ? c.yellow : c.sub

  return (
    <div style={{ display: 'flex', height: '100%', background: c.bg, color: c.text, fontSize: '12px' }}>

      {/* 왼쪽 탭 */}
      <div style={{ width: '90px', borderRight: `1px solid ${c.border}`, padding: '12px 6px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <p style={{ fontSize: '10px', color: c.sub, marginBottom: '8px', textAlign: 'center', letterSpacing: '1px' }}>🔧 점검</p>
        {[
          { key: 'status',      label: '📊 서버 상태' },
          { key: 'accounts',    label: '👤 계정 뷰어' },
          { key: 'db',          label: '🗄️ DB 정리' },
          { key: 'browser',     label: '📁 파일 뷰어' },
          { key: 'logs',        label: '📋 시스템 로그' },
          { key: 'update',      label: '📢 업데이트' },
          { key: 'permissions', label: '🔒 권한 안내' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>
        ))}
        <div style={{ marginTop: 'auto', fontSize: '10px', color: c.sub, textAlign: 'center' }}>
          v{window.__APP_VERSION__ || '-'}
        </div>
      </div>

      {/* 오른쪽 내용 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>

        {/* 서버 상태 */}
        {activeTab === 'status' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>서버 상태</p>
              <button onClick={fetchStatus} style={{ fontSize: '10px', padding: '3px 8px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            {statusLoading ? <p style={{ color: c.sub, fontSize: '11px' }}>불러오는 중...</p>
            : !status ? <p style={{ color: c.red, fontSize: '11px' }}>서버에 연결할 수 없어요</p>
            : <>
              <div style={cardStyle}>
                <p style={labelStyle}>시스템 리소스</p>
                {[
                  { label: 'CPU', value: status.server.cpu_percent, color: status.server.cpu_percent > 80 ? c.red : c.green },
                  { label: '메모리', value: status.server.memory_percent, color: status.server.memory_percent > 80 ? c.red : c.green },
                  { label: '디스크', value: status.server.disk_percent, color: status.server.disk_percent > 80 ? c.red : c.yellow },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: c.sub }}>{item.label}</span>
                      <span style={{ fontSize: '11px', color: item.color, fontWeight: '600' }}>{item.value}%</span>
                    </div>
                    <div style={{ background: c.border, borderRadius: '4px', height: '4px' }}>
                      <div style={{ width: `${item.value}%`, background: item.color, height: '4px', borderRadius: '4px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <p style={labelStyle}>유저 현황</p>
                {[
                  { label: '전체 유저', value: `${status.users.total}명`, color: c.text },
                  { label: '현재 온라인', value: `${status.users.online}명`, color: c.green },
                  { label: '게스트', value: `${status.users.guest}명`, color: c.yellow },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: c.sub }}>{item.label}</span>
                    <span style={{ fontWeight: '600', color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <p style={labelStyle}>파일 현황</p>
                {[
                  { label: '전체 파일', value: `${status.files.total}개` },
                  { label: '휴지통', value: `${status.files.trash}개` },
                  { label: '업로드 용량', value: `${status.files.folder_size_mb} MB` },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: c.sub }}>{item.label}</span>
                    <span style={{ fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <p style={labelStyle}>부서별 인원</p>
                {status.dept_stats.length === 0 ? <p style={{ color: c.sub, fontSize: '11px' }}>부서 없음</p>
                : status.dept_stats.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: c.sub }}>{d.name}</span>
                    <span style={{ fontWeight: '600' }}>{d.count}명</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '10px', color: c.sub, textAlign: 'center' }}>10초마다 자동 갱신</p>
            </>}
          </div>
        )}

        {/* 계정 뷰어 */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>계정 뷰어 (읽기 전용)</p>
              <button onClick={fetchAllUsers} style={{ fontSize: '10px', padding: '3px 8px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
              placeholder="이름, 부서, 아이디 검색..."
              style={{ width: '100%', padding: '7px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: '6px', color: c.text, fontSize: '11px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
            {usersLoading ? <p style={{ color: c.sub, fontSize: '11px' }}>불러오는 중...</p>
            : selectedUser ? (
              <div>
                <button onClick={() => setSelectedUser(null)}
                  style={{ fontSize: '10px', padding: '4px 10px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>
                  ← 목록으로
                </button>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600' }}>{selectedUser.name}</p>
                      <p style={{ fontSize: '10px', color: c.sub }}>{selectedUser.username}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#1a1a3a', color: gradeColor(selectedUser.grade) }}>{selectedUser.grade}</span>
                      <span style={{ fontSize: '10px', color: statusColor(selectedUser.status) }}>● {selectedUser.status}</span>
                    </div>
                  </div>
                  {[
                    { label: '부서', value: selectedUser.dept || '-' },
                    { label: '직책', value: selectedUser.role || '-' },
                    { label: '마지막 활동', value: selectedUser.last_active || '-' },
                    { label: '계정 상태', value: selectedUser.is_active ? '활성' : '비활성' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: c.sub, fontSize: '11px' }}>{item.label}</span>
                      <span style={{ fontSize: '11px' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <p style={labelStyle}>보유 권한 태그</p>
                  {!selectedUser.permissions?.length
                    ? <p style={{ color: c.sub, fontSize: '11px' }}>권한 없음</p>
                    : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {selectedUser.permissions.map(p => {
                          const info = PERMISSION_TAGS.find(t => t.tag_key === p)
                          return <span key={p} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: '#1a1a3a', color: c.accent }}>{info ? info.display_name : p}</span>
                        })}
                      </div>
                  }
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => setSelectedUser(u)}
                    style={{ ...cardStyle, marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>{u.name}</span>
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '8px', background: '#1a1a3a', color: gradeColor(u.grade) }}>{u.grade}</span>
                        {!u.is_active && <span style={{ fontSize: '10px', color: c.red }}>비활성</span>}
                      </div>
                      <p style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>{u.dept} · {u.role || '-'}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: statusColor(u.status) }}>● {u.status}</span>
                    {u.status === 'online' && (
                        <button onClick={(e) => {
                        e.stopPropagation()
                        if (!window.confirm(`${u.name}을 강제 로그아웃할까요?`)) return
                        fetch(`${apiUrl}/admin/force-logout/${u.id}`, { method: 'POST' })
                            .then(() => fetchAllUsers())
                        }} style={{ fontSize: '10px', padding: '2px 6px', background: c.red, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        로그아웃
                        </button>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DB 정리 */}
        {activeTab === 'db' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>DB 정리</p>
              <button onClick={fetchDbInfo} style={{ fontSize: '10px', padding: '3px 8px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            {dbMsg && <p style={{ fontSize: '11px', color: dbMsg.startsWith('✅') ? c.green : c.red, marginBottom: '8px' }}>{dbMsg}</p>}
            {dbLoading ? <p style={{ color: c.sub, fontSize: '11px' }}>분석 중...</p> : <>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <p style={labelStyle}>고아 파일</p>
                    <p style={{ fontSize: '11px', color: c.sub }}>DB엔 있지만 실제 파일이 없는 것</p>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: orphans?.count > 0 ? c.red : c.green }}>{orphans?.count ?? '-'}개</span>
                </div>
                {orphans?.count > 0 && <>
                  <div style={{ maxHeight: '100px', overflow: 'auto', marginBottom: '8px' }}>
                    {orphans.orphans.map(f => <p key={f.id} style={{ fontSize: '10px', color: c.sub, marginBottom: '3px' }}>· {f.original_name}</p>)}
                  </div>
                  <button onClick={handleDeleteOrphans} style={{ width: '100%', padding: '6px', background: c.red, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                    고아 파일 전체 삭제
                  </button>
                </>}
              </div>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <p style={labelStyle}>오래된 휴지통 파일</p>
                    <p style={{ fontSize: '11px', color: c.sub }}>30일 이상 된 휴지통 파일</p>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: oldTrash?.count > 0 ? c.yellow : c.green }}>{oldTrash?.count ?? '-'}개</span>
                </div>
                {oldTrash?.count > 0 && <>
                  <div style={{ maxHeight: '100px', overflow: 'auto', marginBottom: '8px' }}>
                    {oldTrash.files.map(f => <p key={f.id} style={{ fontSize: '10px', color: c.sub, marginBottom: '3px' }}>· {f.original_name} ({f.created_at})</p>)}
                  </div>
                  <button onClick={handleDeleteOldTrash} style={{ width: '100%', padding: '6px', background: c.yellow, color: '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                    30일 이상 파일 전체 삭제
                  </button>
                </>}
              </div>
            </>}
          </div>
        )}

        {/* 파일 브라우저 */}
        {activeTab === 'browser' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>파일 브라우저</p>
              <button onClick={fetchBrowserFiles} style={{ fontSize: '10px', padding: '3px 8px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            {browserMsg && <p style={{ fontSize: '11px', color: browserMsg.startsWith('✅') ? c.green : c.red, marginBottom: '8px' }}>{browserMsg}</p>}
            <p style={{ fontSize: '11px', color: c.sub, marginBottom: '8px' }}>서버에 실제 저장된 파일 목록이에요. DB 기록이 없는 파일만 삭제 가능해요.</p>
            {browserLoading ? <p style={{ color: c.sub, fontSize: '11px' }}>불러오는 중...</p>
            : browserFiles.length === 0 ? <p style={{ color: c.sub, fontSize: '11px' }}>파일이 없어요</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {browserFiles.map(f => (
                  <div key={f.stored_name} style={{ ...cardStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: '11px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</p>
                      <p style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>{f.stored_name} · {f.size_kb} KB</p>
                    </div>
                    {f.in_db
                      ? <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: '#1a3a2a', color: c.green, flexShrink: 0 }}>DB 연결됨</span>
                      : <button onClick={() => handleDeleteBrowserFile(f.stored_name)} style={{ fontSize: '10px', padding: '3px 8px', background: c.red, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>삭제</button>
                    }
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* 시스템 로그 */}
        {activeTab === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>시스템 로그</p>
              <button onClick={fetchLogs} style={{ fontSize: '10px', padding: '3px 8px', background: c.border, color: c.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[{ key: 'files', label: '파일 기록' }, { key: 'logins', label: '로그인 기록' }].map(t => (
                <button key={t.key} onClick={() => setLogTab(t.key)}
                  style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: logTab === t.key ? c.accent : c.border, color: logTab === t.key ? 'white' : c.sub }}>
                  {t.label}
                </button>
              ))}
            </div>
            {logsLoading ? <p style={{ color: c.sub, fontSize: '11px' }}>불러오는 중...</p>
            : logTab === 'files'
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fileLogs.map(f => (
                    <div key={f.id} style={{ ...cardStyle, marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '11px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.original_name}</p>
                        {f.is_deleted && <span style={{ fontSize: '10px', color: c.red, marginLeft: '6px', flexShrink: 0 }}>휴지통</span>}
                      </div>
                      <p style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>{f.uploader} · {f.dept} · {f.created_at}</p>
                    </div>
                  ))}
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {loginLogs.map((u, i) => (
                    <div key={i} style={{ ...cardStyle, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: '500' }}>{u.name}</p>
                        <p style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>{u.dept} · {u.last_active}</p>
                      </div>
                      <span style={{ fontSize: '10px', color: statusColor(u.status) }}>● {u.status}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* 업데이트 공지 */}
        {activeTab === 'update' && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>업데이트 공지</p>
            {currentUser && (
            <div style={cardStyle}>
                <p style={labelStyle}>새 업데이트 공지 작성</p>
                <input value={updateTitle} onChange={e => setUpdateTitle(e.target.value)} placeholder="버전 또는 제목 (예: v0.3.0)"
                style={{ width: '100%', padding: '7px 10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '6px', color: c.text, fontSize: '11px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />
                <textarea value={updateContent} onChange={e => setUpdateContent(e.target.value)} placeholder="업데이트 내역을 입력해주세요" rows={5}
                style={{ width: '100%', padding: '7px 10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '6px', color: c.text, fontSize: '11px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                {updateMsg && <p style={{ fontSize: '11px', color: updateMsg.startsWith('✅') ? c.green : c.red, marginTop: '6px' }}>{updateMsg}</p>}
                <button onClick={handlePostUpdate} disabled={updateSaving}
                style={{ marginTop: '8px', width: '100%', padding: '8px', background: updateSaving ? c.border : c.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: updateSaving ? 'default' : 'pointer', fontSize: '11px', fontWeight: '600' }}>
                {updateSaving ? '등록 중...' : '📢 공지 등록'}
                </button>
            </div>
            )}
            <div style={cardStyle}>
              <p style={labelStyle}>업데이트 내역</p>
              {updateLogs.length === 0 ? <p style={{ color: c.sub, fontSize: '11px' }}>아직 업데이트 공지가 없어요</p>
              : updateLogs.map(log => (
                <div key={log.id} style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: '8px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: c.accent }}>{log.title}</p>
                  <p style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>{log.created_at}</p>
                  <p style={{ fontSize: '11px', color: c.text, marginTop: '4px', whiteSpace: 'pre-wrap' }}>{log.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 권한 안내 */}
        {activeTab === 'permissions' && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>권한 안내</p>
            <div style={cardStyle}>
              <p style={labelStyle}>탭별 접근 권한</p>
              {TAB_PERMISSIONS.map(t => (
                <div key={t.tab} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: c.text, fontSize: '11px' }}>{t.tab}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: t.permission === null ? '#1a3a2a' : '#1a1a3a', color: t.permission === null ? c.green : c.accent }}>{t.desc}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>개별 권한 태그 목록</p>
              {PERMISSION_TAGS.map(pt => (
                <div key={pt.tag_key} style={{ marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: c.accent, background: '#1a1a3a', padding: '2px 6px', borderRadius: '4px' }}>{pt.tag_key}</span>
                  <span style={{ fontSize: '11px', color: c.sub, marginLeft: '8px' }}>{pt.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminPanel