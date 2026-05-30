import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getApiUrl } from './config'
import StarterKit from '@tiptap/starter-kit'
import MyFolders from './MyFolders'
import Schedule from './Schedule'

const typeIcon = { pdf: '📄', doc: '📝', xls: '📊', ppt: '📑', default: '📎' }
const MEMO_COLORS = ['#FAEEDA', '#E1F5EE', '#EEEDFE', '#FFF5F5', '#E8F4FD', '#F5F5F5']

function Workspace({ currentUser, onNavigate, onOpenChat, sideChat, onFilesChange, initialTab, onTabLoaded, onFloatMemo, memoRefreshTick, dockMemo, onDockComplete, isDraggingMemo, onOpenRoom }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  function getIcon(name) {
    if (!name) return '📎'
    const ext = name.split('.').pop().toLowerCase()
    const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📑', pptx: '📑', hwp: '📃', hwpx: '📃' }
    return map[ext] || '📎'
  }

  const [announcements, setAnnouncements] = useState([])
  const [recentItems, setRecentItems] = useState([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [recentFiles, setRecentFiles] = useState([])
  const [memos, setMemos] = useState([])
  const [selectedMemo, setSelectedMemo] = useState(undefined)
  const [memoForm, setMemoForm] = useState({ title: '', content: '', color: '#FAEEDA' })

  const memoEditor = useEditor({
    extensions: [StarterKit],
    content: memoForm.content,
    onUpdate: ({ editor }) => {
      const updated = { ...memoForm, content: editor.getHTML() }
      setMemoForm(updated)
      autoSave(updated, selectedMemo)
    }
  })

  const autoSaveTimer = useRef(null)
  const [autoSaved, setAutoSaved] = useState(false)
  const [todaySchedules, setTodaySchedules] = useState([])

  useEffect(() => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    fetch(`${getApiUrl()}/schedules/${currentUser.id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data))
        setTodaySchedules(data.filter(s => s.date === dateStr).sort((a,b) => { if (!a.time) return 1; if (!b.time) return -1; return a.time.localeCompare(b.time) }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMemos = useCallback(() => {
    fetch(`${getApiUrl()}/memos/${currentUser.id}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setMemos(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const autoSave = useCallback((form, memo) => {
    if (!memo) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      fetch(`${getApiUrl()}/memos/${memo.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, content: form.content, color: form.color })
      }).then(() => { fetchMemos(); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000) })
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMemos])

  useEffect(() => {
    if (memoEditor && memoForm.content !== memoEditor.getHTML()) memoEditor.commands.setContent(memoForm.content)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemo])

  const fetchRecentItems = useCallback(() => {
    Promise.all([
      fetch(`${getApiUrl()}/users/${currentUser.id}`).then(r => r.json()),
      fetch(`${getApiUrl()}/rooms/${currentUser.id}`).then(r => r.json())
    ]).then(([users, rooms]) => {
      const dms = Array.isArray(users) ? users.filter(u => u.last_message).map(u => ({ ...u, type: 'dm', sortKey: u.last_message_at || '' })) : []
      const roomItems = Array.isArray(rooms) ? rooms.filter(r => r.lastMessage).map(r => ({ ...r, type: 'room', sortKey: r.last_message_at || '' })) : []
      const combined = [...dms, ...roomItems].sort((a, b) => {
        if (!a.sortKey && !b.sortKey) return 0; if (!a.sortKey) return 1; if (!b.sortKey) return -1
        return b.sortKey.localeCompare(a.sortKey)
      }).slice(0, 3)
      setRecentItems(combined)
    }).catch(err => console.log('에러:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchRecentItems, 10000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch(`${getApiUrl()}/announcements?limit=3`).then(r => r.json()).then(data => { if (Array.isArray(data)) setAnnouncements(data) })
    fetch(`${getApiUrl()}/user-files/${currentUser.id}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setRecentFiles(data.slice(0, 4)) })
    fetchRecentItems(); fetchMemos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialTab) { setActiveTab(initialTab); if (onTabLoaded) onTabLoaded() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  useEffect(() => { if (memoRefreshTick > 0) fetchMemos() }, [memoRefreshTick, fetchMemos])

  useEffect(() => {
    if (!dockMemo) return
    const found = memos.find(m => m.id === dockMemo.id)
    const target = found || dockMemo
    setSelectedMemo(target)
    setMemoForm({ title: target.title || '', content: target.content || '', color: target.color || '#FAEEDA' })
    onDockComplete?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockMemo])

  const handleSaveMemo = () => {
    if (selectedMemo) {
      fetch(`${getApiUrl()}/memos/${selectedMemo.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memoForm.title, content: memoForm.content, color: memoForm.color })
      }).then(() => fetchMemos())
    } else {
      fetch(`${getApiUrl()}/memos/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, title: memoForm.title, content: memoForm.content, color: memoForm.color })
      }).then(r => r.json()).then(data => { fetchMemos(); setSelectedMemo({ id: data.id, ...memoForm }) })
    }
  }

  const handleDeleteMemo = () => {
    if (!selectedMemo) return
    fetch(`${getApiUrl()}/memos/${selectedMemo.id}`, { method: 'DELETE' }).then(() => {
      fetchMemos(); setSelectedMemo(undefined); setMemoForm({ title: '', content: '', color: '#FAEEDA' })
    })
  }

  const card = { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }
  const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }
  const modalStyle = { background: 'var(--surface)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* 상단 탭 */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, padding: '0 20px' }}>
        {[
          { key: 'dashboard', label: '🏠 대시보드' },
          { key: 'folders',   label: '📁 내 폴더' },
          { key: 'schedule',  label: '📅 일정' },
          { key: 'memos',     label: '📝 메모장' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '12px 16px', border: 'none', background: 'transparent', fontSize: 'var(--font-size)', cursor: 'pointer', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === tab.key ? '500' : '400' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 대시보드 */}
      {activeTab === 'dashboard' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 환영 */}
            <div style={{ background: 'var(--accent)', borderRadius: '12px', padding: '20px 24px', color: 'var(--accent-text)' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>안녕하세요, {currentUser.name}님 👋</p>
              <p style={{ fontSize: 'var(--font-size)', opacity: 0.8, marginTop: '6px' }}>{currentUser.dept} · {currentUser.role}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              {/* 공지사항 */}
              <div style={card}>
                <div onClick={() => onNavigate && onNavigate('메신저', 'notice')}
                  style={cardHeader}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>📢 공지사항</p>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>전체보기 →</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {announcements.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>공지사항이 없어요</p>
                  ) : announcements.map(ann => (
                    <div key={ann.id} onClick={() => setSelectedAnnouncement(ann)}
                      style={{ padding: '10px 16px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{ann.title}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{ann.author} · {ann.created_at}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 대화 */}
              <div style={card}>
                <div onClick={() => onNavigate && onNavigate('메신저')}
                  style={cardHeader}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>💬 최근 대화</p>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>전체보기 →</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {recentItems.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>최근 대화가 없어요</p>
                  ) : recentItems.map(item => (
                    <div key={`${item.type}-${item.id}`}
                      onClick={() => item.type === 'room' ? onOpenRoom?.(item) : onOpenChat?.(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: '30px', height: '30px', borderRadius: item.type === 'room' ? '8px' : '50%', background: item.type === 'room' ? 'var(--green-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size)', flexShrink: 0 }}>
                        {item.type === 'room' ? '🏠' : (item.name?.[0] || '?')}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text)' }}>{item.name}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.type === 'room' ? item.lastMessage : item.last_message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 오늘의 할일 */}
              <div style={card}>
                <div onClick={() => setActiveTab('schedule')}
                  style={cardHeader}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>📅 오늘의 할일</p>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>전체보기 →</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {todaySchedules.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>오늘 일정이 없어요 😊</p>
                  ) : todaySchedules.slice(0, 4).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                      <p style={{ fontSize: 'var(--font-size-sm)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: s.is_done ? 'line-through' : 'none', color: s.is_done ? 'var(--text-muted)' : 'var(--text)' }}>
                        {s.title}
                      </p>
                      {s.time && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', flexShrink: 0 }}>{s.time}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 파일 */}
              <div style={card}>
                <div onClick={() => setActiveTab('folders')}
                  style={cardHeader}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>🕐 최근 파일</p>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>전체보기 →</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {recentFiles.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>최근 파일이 없어요</p>
                  ) : recentFiles.map(file => (
                    <div key={file.user_file_id}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>{getIcon(file.display_name)}</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{file.display_name}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{file.created_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 내 폴더 탭 */}
      {activeTab === 'folders' && <MyFolders currentUser={currentUser} onFilesChange={onFilesChange} />}

      {/* 일정 탭 */}
      {activeTab === 'schedule' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Schedule currentUser={currentUser} onNavigate={onNavigate} />
        </div>
      )}

      {/* 메모장 */}
      {activeTab === 'memos' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 왼쪽 메모 목록 */}
          <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => {
                const form = { title: '', content: '', color: '#FAEEDA' }
                fetch(`${getApiUrl()}/memos/create`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: currentUser.id, title: '', content: '', color: '#FAEEDA' })
                }).then(r => r.json()).then(data => {
                  const newMemo = { id: data.id, title: '', content: '', color: '#FAEEDA', updated_at: '방금' }
                  setMemos(prev => [newMemo, ...prev]); setSelectedMemo(newMemo); setMemoForm(form)
                })
              }} style={{ width: '100%', padding: '8px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size)' }}>
                + 새 메모
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {memos.length === 0 ? (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>메모가 없어요</p>
              ) : memos.map(memo => (
                <div key={memo.id}
                  onClick={() => { setSelectedMemo(memo); setMemoForm({ title: memo.title, content: memo.content, color: memo.color }) }}
                  style={{ background: memo.color, borderRadius: '8px', padding: '10px', cursor: 'pointer', border: selectedMemo?.id === memo.id ? '2px solid var(--accent)' : '2px solid transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                    {memo.title || '제목 없음'}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginTop: '4px' }}>{memo.updated_at}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽 에디터 */}
          {selectedMemo !== undefined ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: memoForm.color, overflow: 'hidden', position: 'relative' }}>
              {/* 툴바 */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.5)' }}>
                {MEMO_COLORS.map(c => (
                  <button key={c} onClick={() => setMemoForm(prev => ({ ...prev, color: c }))}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: memoForm.color === c ? '2px solid var(--accent)' : '2px solid rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0 }} />
                ))}
                <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }} />
                {[
                  { label: 'B', action: () => memoEditor?.chain().focus().toggleBold().run(), active: memoEditor?.isActive('bold'), style: { fontWeight: 'bold' } },
                  { label: 'I', action: () => memoEditor?.chain().focus().toggleItalic().run(), active: memoEditor?.isActive('italic'), style: { fontStyle: 'italic' } },
                  { label: 'S', action: () => memoEditor?.chain().focus().toggleStrike().run(), active: memoEditor?.isActive('strike'), style: { textDecoration: 'line-through' } },
                  { label: '•', action: () => memoEditor?.chain().focus().toggleBulletList().run(), active: memoEditor?.isActive('bulletList') },
                  { label: '1.', action: () => memoEditor?.chain().focus().toggleOrderedList().run(), active: memoEditor?.isActive('orderedList') },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', background: btn.active ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', ...btn.style }}>
                    {btn.label}
                  </button>
                ))}
              </div>
              <input value={memoForm.title}
                onChange={e => { const updated = { ...memoForm, title: e.target.value }; setMemoForm(updated); autoSave(updated, selectedMemo) }}
                placeholder="제목 입력..."
                style={{ padding: '16px 20px', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: 'var(--font-size-lg)', fontWeight: '600', outline: 'none', background: 'transparent', color: '#333' }} />
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                <EditorContent editor={memoEditor} />
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
                {autoSaved && <span style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>✅ 자동 저장됨</span>}
                {selectedMemo && (
                  <button onClick={handleDeleteMemo}
                    style={{ padding: '8px 16px', border: '1px solid var(--red)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--red)' }}>
                    삭제
                  </button>
                )}
                {selectedMemo && (
                  <button onClick={() => { onFloatMemo?.(selectedMemo, memoForm); setSelectedMemo(undefined) }}
                    style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent)' }}>
                    ⧉ 분리
                  </button>
                )}
                <button onClick={handleSaveMemo}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>
                  저장
                </button>
              </div>
            </div>
          ) : (
            <div data-memo-dropzone="true"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative' }}>
              {isDraggingMemo ? (
                <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
                  <p style={{ fontSize: '20px' }}>📝</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', marginTop: '6px' }}>여기에 놓으면 돌아와요</p>
                </div>
              ) : (
                <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)' }}>📝 메모를 선택하거나 새로 만들어보세요</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 공지 상세 모달 */}
      {selectedAnnouncement && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedAnnouncement(null)}>
          <div style={{ ...modalStyle, width: '400px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>{selectedAnnouncement.title}</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{selectedAnnouncement.author} · {selectedAnnouncement.created_at}</p>
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)', lineHeight: '1.8' }}>{selectedAnnouncement.content}</p>
            <button onClick={() => setSelectedAnnouncement(null)}
              style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 파일 상세 모달 */}
      {selectedFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedFile(null)}>
          <div style={{ ...modalStyle, width: '340px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '32px', textAlign: 'center' }}>{typeIcon[selectedFile.type] || typeIcon.default}</p>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', textAlign: 'center' }}>{selectedFile.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[{ label: '날짜', value: selectedFile.date }, { label: '크기', value: selectedFile.size }].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setSelectedFile(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
                닫기
              </button>
              <button style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)' }}>
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Workspace