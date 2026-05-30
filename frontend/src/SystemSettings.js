import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

const PERMISSION_TAGS = [
  { tag_key: 'basic',                display_name: '기본 기능',       description: '채팅, 공지 조회, 파일 업로드, 휴지통 이동 등' },
  { tag_key: 'file_permanent_delete',display_name: '파일 영구 삭제',  description: '서버 저장소 파일 영구 삭제' },
  { tag_key: 'file_classify',        display_name: '파일 분류',       description: '미분류 파일 수동 분류' },
  { tag_key: 'file_manage',          display_name: '파일 관리 탭',    description: '파일 관리 탭 접근' },
  { tag_key: 'announce_write',       display_name: '공지 작성',       description: '공지사항 작성/수정/삭제' },
  { tag_key: 'room_create',          display_name: '협업방 생성',     description: '협업방 만들기' },
  { tag_key: 'room_delete',          display_name: '협업방 삭제',     description: '협업방 삭제' },
  { tag_key: 'member_manage',        display_name: '인사 관리',       description: '직원 계정 활성/비활성/퇴사 처리' },
  { tag_key: 'member_add',           display_name: '회원 추가',       description: '신규 회원 추가' },
  { tag_key: 'system_setting',       display_name: '시스템 설정',     description: '시스템 설정 페이지 접근' },
]

function SystemSettings({ currentUser }) {
  const [activeTab, setActiveTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [jobTitles, setJobTitles] = useState([])
  const [setTags, setSetTags] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [deptError, setDeptError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [showSetTagModal, setShowSetTagModal] = useState(false)
  const [editingSetTag, setEditingSetTag] = useState(null)
  const [setTagForm, setSetTagForm] = useState({ name: '', tags: [] })
  const [selectedDept, setSelectedDept] = useState(null)
  const [selectedJobTitle, setSelectedJobTitle] = useState(null)
  const [deptPermissions, setDeptPermissions] = useState([])
  const [jobPermissions, setJobPermissions] = useState([])
  const [permSaveMsg, setPermSaveMsg] = useState('')

  useEffect(() => { fetchDepartments(); fetchJobTitles(); fetchSetTags() }, []) // eslint-disable-line

  const fetchDepartments = () => fetch(`${getApiUrl()}/departments`).then(r => r.json()).then(data => { if (Array.isArray(data)) setDepartments(data) })
  const fetchJobTitles = () => fetch(`${getApiUrl()}/jobtitles`).then(r => r.json()).then(data => { if (Array.isArray(data)) setJobTitles(data) })
  const fetchSetTags = () => fetch(`${getApiUrl()}/set-tags`).then(r => r.json()).then(data => { if (Array.isArray(data)) setSetTags(data) })
  const fetchDeptPermissions = (deptKey) => fetch(`${getApiUrl()}/dept-permissions/${deptKey}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setDeptPermissions(data) })
  const fetchJobPermissions = (jobTitleId) => fetch(`${getApiUrl()}/jobtitle-permissions/${jobTitleId}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setJobPermissions(data) })

  const handleCreateDept = () => {
    if (!newDeptName.trim()) { setDeptError('부서명을 입력해주세요!'); return }
    fetch(`${getApiUrl()}/departments/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `dept_${Date.now()}`, name: newDeptName }) })
      .then(() => { fetchDepartments(); setNewDeptName(''); setDeptError(''); setShowDeptModal(false) })
  }

  const handleCreateTitle = () => {
    if (!newTitle.trim()) { setTitleError('직책명을 입력해주세요!'); return }
    fetch(`${getApiUrl()}/jobtitles/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, role: 'user' }) })
      .then(() => { fetchJobTitles(); setNewTitle(''); setTitleError(''); setShowTitleModal(false) })
  }

  const handleSaveSetTag = () => {
    if (!setTagForm.name.trim()) return
    const url = editingSetTag ? `${getApiUrl()}/set-tags/${editingSetTag.id}` : `${getApiUrl()}/set-tags`
    const method = editingSetTag ? 'PUT' : 'POST'
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(setTagForm) })
      .then(() => { fetchSetTags(); setShowSetTagModal(false) })
  }

  const handleDeleteSetTag = (id) => {
    if (!window.confirm('세트 태그를 삭제할까요?')) return
    fetch(`${getApiUrl()}/set-tags/${id}`, { method: 'DELETE' }).then(() => fetchSetTags())
  }

  const handleSaveDeptPermissions = () => {
    if (!selectedDept) return
    fetch(`${getApiUrl()}/dept-permissions/${selectedDept.key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: deptPermissions }) })
      .then(() => { setPermSaveMsg('저장되었습니다!'); setTimeout(() => setPermSaveMsg(''), 2000) })
  }

  const handleSaveJobPermissions = () => {
    if (!selectedJobTitle) return
    fetch(`${getApiUrl()}/jobtitle-permissions/${selectedJobTitle.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: jobPermissions }) })
      .then(() => { setPermSaveMsg('저장되었습니다!'); setTimeout(() => setPermSaveMsg(''), 2000) })
  }

  const toggleIndividualTag = (tagKey, target) => {
    const setter = target === 'dept' ? setDeptPermissions : setJobPermissions
    const current = target === 'dept' ? deptPermissions : jobPermissions
    const exists = current.find(t => t.tag_key === tagKey && t.tag_type === 'individual')
    setter(exists ? current.filter(t => !(t.tag_key === tagKey && t.tag_type === 'individual')) : [...current, { tag_key: tagKey, tag_type: 'individual' }])
  }

  const toggleSetTag = (setTagName, target) => {
    const setter = target === 'dept' ? setDeptPermissions : setJobPermissions
    const current = target === 'dept' ? deptPermissions : jobPermissions
    const exists = current.find(t => t.tag_key === setTagName && t.tag_type === 'set')
    setter(exists ? current.filter(t => !(t.tag_key === setTagName && t.tag_type === 'set')) : [...current, { tag_key: setTagName, tag_type: 'set' }])
  }

  const isIndividualTagOn = (tagKey, target) => (target === 'dept' ? deptPermissions : jobPermissions).some(t => t.tag_key === tagKey && t.tag_type === 'individual')
  const isSetTagOn = (setTagName, target) => (target === 'dept' ? deptPermissions : jobPermissions).some(t => t.tag_key === setTagName && t.tag_type === 'set')

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }
  const modalStyle = { background: 'var(--surface)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }
  const inputStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)' }
  const btn = { padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }
  const btnGray = { padding: '7px 14px', background: 'var(--surface-alt)', color: 'var(--text-sub)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }
  const btnRed = { padding: '4px 10px', border: '1px solid var(--red)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--red)' }
  const sectionTitle = { fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', fontWeight: '500', marginBottom: '8px' }
  const tagStyle = (on) => ({ padding: '5px 10px', borderRadius: '20px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: '500', background: on ? 'var(--accent)' : 'var(--surface-alt)', color: on ? 'var(--accent-text)' : 'var(--text-sub)', border: 'none', transition: 'all 0.15s' })
  const setTagBadge = (on) => ({ padding: '5px 10px', borderRadius: '20px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: '500', background: on ? 'var(--green)' : 'var(--surface-alt)', color: on ? 'white' : 'var(--text-sub)', border: 'none', transition: 'all 0.15s' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>⚙️ 시스템 설정</p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>부서, 직책, 권한을 관리하는 설정 페이지예요</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '180px', borderRight: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          {[
            { key: 'departments', label: '🏢 부서 관리' },
            { key: 'jobtitles',   label: '💼 직책 관리' },
            { key: 'settags',     label: '🏷️ 세트 태그' },
            { key: 'permissions', label: '🔒 권한 설정' },
            { key: 'grade',       label: '👥 등급 안내' },
          ].map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 'var(--font-size)', background: activeTab === tab.key ? 'var(--accent-light)' : 'transparent', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-sub)', fontWeight: activeTab === tab.key ? '500' : '400', borderLeft: activeTab === tab.key ? '3px solid var(--accent)' : '3px solid transparent' }}>
              {tab.label}
            </div>
          ))}
        </div>

        {/* 오른쪽 내용 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'var(--bg)' }}>

          {/* 부서 관리 */}
          {activeTab === 'departments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>부서 관리</p>
                <button onClick={() => setShowDeptModal(true)} style={btn}>+ 부서 추가</button>
              </div>
              {departments.length === 0 ? (
                <div style={{ ...card, padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>아직 추가된 부서가 없어요</div>
              ) : departments.map(dept => (
                <div key={dept.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', flex: 1, color: 'var(--text)' }}>{dept.name}</p>
                  <button onClick={() => { if (window.confirm(`${dept.name} 부서를 삭제할까요?`)) fetch(`${getApiUrl()}/departments/${dept.key}`, { method: 'DELETE' }).then(() => fetchDepartments()) }} style={btnRed}>삭제</button>
                </div>
              ))}
              {showDeptModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ ...modalStyle, width: '340px' }}>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>새 부서 추가</p>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>부서명</label>
                    <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDept()} placeholder="예: 개발팀" style={inputStyle} />
                    {deptError && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{deptError}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowDeptModal(false); setNewDeptName(''); setDeptError('') }}
                        style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
                      <button onClick={handleCreateDept}
                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>추가하기</button>
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
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>직책 관리</p>
                <button onClick={() => setShowTitleModal(true)} style={btn}>+ 직책 추가</button>
              </div>
              {jobTitles.length === 0 ? (
                <div style={{ ...card, padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>아직 추가된 직책이 없어요</div>
              ) : jobTitles.map(title => (
                <div key={title.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', flex: 1, color: 'var(--text)' }}>{title.title}</p>
                  <button onClick={() => fetch(`${getApiUrl()}/jobtitles/${title.id}`, { method: 'DELETE' }).then(() => fetchJobTitles())} style={btnRed}>삭제</button>
                </div>
              ))}
              {showTitleModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ ...modalStyle, width: '340px' }}>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>새 직책 추가</p>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>직책명</label>
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateTitle()} placeholder="예: 팀장, 부장, 사원" style={inputStyle} />
                    {titleError && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{titleError}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowTitleModal(false); setNewTitle(''); setTitleError('') }}
                        style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
                      <button onClick={handleCreateTitle}
                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>추가하기</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 세트 태그 관리 */}
          {activeTab === 'settags' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>세트 태그 관리</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>개별 권한 태그를 묶어서 한번에 부여할 수 있는 세트를 만들어요</p>
                </div>
                <button onClick={() => { setEditingSetTag(null); setSetTagForm({ name: '', tags: [] }); setShowSetTagModal(true) }} style={btn}>+ 세트 추가</button>
              </div>
              {setTags.length === 0 ? (
                <div style={{ ...card, padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>아직 만든 세트 태그가 없어요</div>
              ) : setTags.map(st => (
                <div key={st.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ fontSize: 'var(--font-size)', fontWeight: '600', flex: 1, color: 'var(--text)' }}>🏷️ {st.name}</p>
                    <button onClick={() => { setEditingSetTag(st); setSetTagForm({ name: st.name, tags: st.tags || [] }); setShowSetTagModal(true) }} style={btnGray}>수정</button>
                    <button onClick={() => handleDeleteSetTag(st.id)} style={btnRed}>삭제</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(st.tags || []).length === 0
                      ? <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>포함된 태그 없음</span>
                      : (st.tags || []).map(tagKey => {
                          const info = PERMISSION_TAGS.find(t => t.tag_key === tagKey)
                          return <span key={tagKey} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: 'var(--font-size-sm)', background: 'var(--surface-alt)', color: 'var(--text-sub)' }}>{info ? info.display_name : tagKey}</span>
                        })
                    }
                  </div>
                </div>
              ))}
              {showSetTagModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ ...modalStyle, width: '400px', maxHeight: '80vh', overflow: 'auto' }}>
                    <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>{editingSetTag ? '세트 태그 수정' : '새 세트 태그 만들기'}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>세트 이름</label>
                      <input value={setTagForm.name} onChange={e => setSetTagForm(prev => ({ ...prev, name: e.target.value }))} placeholder="예: 팀장 권한" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>포함할 권한 태그 선택</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {PERMISSION_TAGS.map(pt => {
                          const on = setTagForm.tags.includes(pt.tag_key)
                          return (
                            <div key={pt.tag_key} onClick={() => setSetTagForm(prev => ({ ...prev, tags: on ? prev.tags.filter(k => k !== pt.tag_key) : [...prev.tags, pt.tag_key] }))}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: on ? 'var(--accent-light)' : 'var(--surface-alt)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}` }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {on && <span style={{ color: 'var(--accent-text)', fontSize: '10px' }}>✓</span>}
                              </div>
                              <div>
                                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: on ? 'var(--accent)' : 'var(--text)' }}>{pt.display_name}</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{pt.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowSetTagModal(false)}
                        style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
                      <button onClick={handleSaveSetTag}
                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>저장하기</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 권한 설정 */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>권한 설정</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>부서 또는 직책에 권한 태그를 부여해요. 개인 직접 부여는 인사관리에서 할 수 있어요.</p>
              </div>

              {/* 부서별 권한 */}
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '600', color: 'var(--text)' }}>🏢 부서별 권한</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {departments.map(dept => (
                    <button key={dept.id} onClick={() => { setSelectedDept(dept); setSelectedJobTitle(null); fetchDeptPermissions(dept.key) }}
                      style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: '500', background: selectedDept?.id === dept.id ? 'var(--accent)' : 'var(--surface-alt)', color: selectedDept?.id === dept.id ? 'var(--accent-text)' : 'var(--text-sub)', border: 'none' }}>
                      {dept.name}
                    </button>
                  ))}
                </div>
                {selectedDept && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>
                      <b style={{ color: 'var(--accent)' }}>{selectedDept.name}</b> 에 부여할 권한을 선택해요
                    </p>
                    {setTags.length > 0 && (
                      <div>
                        <p style={sectionTitle}>세트 태그</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {setTags.map(st => <button key={st.id} onClick={() => toggleSetTag(st.name, 'dept')} style={setTagBadge(isSetTagOn(st.name, 'dept'))}>🏷️ {st.name}</button>)}
                        </div>
                      </div>
                    )}
                    <div>
                      <p style={sectionTitle}>개별 권한 태그</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {PERMISSION_TAGS.map(pt => <button key={pt.tag_key} onClick={() => toggleIndividualTag(pt.tag_key, 'dept')} title={pt.description} style={tagStyle(isIndividualTagOn(pt.tag_key, 'dept'))}>{pt.display_name}</button>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={handleSaveDeptPermissions}
                        style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size)', fontWeight: '500' }}>저장하기</button>
                      {permSaveMsg && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--green)', fontWeight: '500' }}>✅ {permSaveMsg}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* 직책별 권한 */}
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '600', color: 'var(--text)' }}>💼 직책별 권한</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {jobTitles.map(jt => (
                    <button key={jt.id} onClick={() => { setSelectedJobTitle(jt); setSelectedDept(null); fetchJobPermissions(jt.id) }}
                      style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: '500', background: selectedJobTitle?.id === jt.id ? 'var(--accent)' : 'var(--surface-alt)', color: selectedJobTitle?.id === jt.id ? 'var(--accent-text)' : 'var(--text-sub)', border: 'none' }}>
                      {jt.title}
                    </button>
                  ))}
                </div>
                {selectedJobTitle && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>
                      <b style={{ color: 'var(--accent)' }}>{selectedJobTitle.title}</b> 에 부여할 권한을 선택해요
                    </p>
                    {setTags.length > 0 && (
                      <div>
                        <p style={sectionTitle}>세트 태그</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {setTags.map(st => <button key={st.id} onClick={() => toggleSetTag(st.name, 'job')} style={setTagBadge(isSetTagOn(st.name, 'job'))}>🏷️ {st.name}</button>)}
                        </div>
                      </div>
                    )}
                    <div>
                      <p style={sectionTitle}>개별 권한 태그</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {PERMISSION_TAGS.map(pt => <button key={pt.tag_key} onClick={() => toggleIndividualTag(pt.tag_key, 'job')} title={pt.description} style={tagStyle(isIndividualTagOn(pt.tag_key, 'job'))}>{pt.display_name}</button>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={handleSaveJobPermissions}
                        style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size)', fontWeight: '500' }}>저장하기</button>
                      {permSaveMsg && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--green)', fontWeight: '500' }}>✅ {permSaveMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 등급 안내 */}
          {activeTab === 'grade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500', color: 'var(--text)' }}>앱 등급 안내</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>등급은 앱 전체 접근 수준을 결정해요. 세부 기능은 권한 태그로 제어해요.</p>
              {[
                { grade: 'super_admin', label: '🔴 super_admin', desc: '모든 권한 자동 보유. 시스템 점검/관리용. 태그 설정 무관하게 모든 기능 접근 가능.', bg: 'var(--red-light)', border: 'var(--red)' },
                { grade: 'user',        label: '🟢 user',        desc: '일반 회사 직원. 부서/직책/개인에 부여된 권한 태그에 따라 기능 접근 범위가 결정됨.', bg: 'var(--green-light)', border: 'var(--green)' },
                { grade: 'guest',       label: '🟡 guest',       desc: '외부 협력사. basic 태그만 자동 보유. 채팅/공지 조회 등 최소 기능만 접근 가능.', bg: '#fffbf0', border: 'var(--yellow)' },
              ].map(item => (
                <div key={item.grade} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>{item.label}</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{item.desc}</p>
                </div>
              ))}
              <div style={{ ...card, marginTop: '8px' }}>
                <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', marginBottom: '10px', color: 'var(--text)' }}>📋 개별 권한 태그 전체 목록</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PERMISSION_TAGS.map(pt => (
                    <div key={pt.tag_key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)', color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '1px' }}>{pt.tag_key}</span>
                      <div>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text)' }}>{pt.display_name}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{pt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SystemSettings