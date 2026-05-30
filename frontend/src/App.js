import { useState, useEffect } from 'react'
import { getApiUrl} from './config'
import Login from './Login'
import Profile from './Profile'
import Messenger from './Messenger'
import ChatPanel from './ChatPanel'
import ServerStorage from './ServerStorage'
import AddMember from './AddMember'
import GuestView from './GuestView'
import RoomPanel from './RoomPanel'
import SystemSettings from './SystemSettings'
import HRManagement from './HRManagement'
import Onboarding from './Onboarding'
import Workspace from './Workspace'
import MemoPanel from './MemoPanel'
import FileManagement from './FileManagement'
import AdminPanel from './AdminPanel'
import { initTheme } from './theme'
initTheme() 

function App() {
  const [activeTab, setActiveTab] = useState('내 워크스페이스')
  const [currentUser, setCurrentUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [floatingChats, setFloatingChats] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [messengerSubTab, setMessengerSubTab] = useState(null)
  const [sideChat, setSideChat] = useState(null) 
  const [sideChatWidth, setSideChatWidth] = useState(340)
  const [sideRoom, setSideRoom] = useState(null)
  const [floatingMemos, setFloatingMemos] = useState([])
  const [memoRefreshTick, setMemoRefreshTick] = useState(0)
  const [dockMemo, setDockMemo] = useState(null)
  const [workspaceFiles, setWorkspaceFiles] = useState([])
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showUpdateLog, setShowUpdateLog] = useState(false)
  const [updateLogs, setUpdateLogs] = useState([]) 

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    fetch(`${getApiUrl()}/user-files/${currentUser.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setWorkspaceFiles(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [workspaceSubTab, setWorkspaceSubTab] = useState(null)
  const [isDraggingMemo, setIsDraggingMemo] = useState(false)
  const [favUsers, setFavUsers] = useState([])
  const [favRooms, setFavRooms] = useState([])
  const [favRefreshTick, setFavRefreshTick] = useState(0)

  const handleSideChatResize = (e) => {
    const startX = e.clientX
    const startW = sideChatWidth
    const onMove = (moveE) => setSideChatWidth(Math.max(280, Math.min(700,startW + startX - moveE.clientX)))
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
  if (!currentUser) return
    let lastActive = 0
    const updateActive = () => {
      const now = Date.now()
      if (now - lastActive < 60000) return
      lastActive = now
      fetch(`${getApiUrl()}/users/active/${currentUser.id}`, { method: 'POST' })
    }
    const handleUnload = () => {
      navigator.sendBeacon(`${getApiUrl()}/users/logout/${currentUser.id}`)
    }
    window.addEventListener('mousemove', updateActive)
    window.addEventListener('keydown', updateActive)
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('mousemove', updateActive)
      window.removeEventListener('keydown', updateActive)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [currentUser])

  const getTabs = () => {
    const base = ['내 워크스페이스', '메신저', '서버 저장소']
    if (currentUser?.grade === 'super_admin' || currentUser?.permissions?.includes('member_manage')) base.push('인사 관리')
    if (currentUser?.grade === 'super_admin' || currentUser?.permissions?.includes('file_manage')) base.push('파일 관리')
    if (currentUser?.grade === 'super_admin' || currentUser?.permissions?.includes('system_setting')) base.push('시스템 설정')
    return base
  }

  const tabs = getTabs()

  const fetchFavorites = () => {
    fetch(`${getApiUrl()}/favorites/${currentUser?.id}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        setFavUsers(data.filter(f => f.type === 'user').map(f => f.target_id))
        setFavRooms(data.filter(f => f.type === 'room').map(f => f.target_id))
      })
  }

  useEffect(() => {
    if (currentUser) fetchFavorites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  if (!currentUser) return (
    <Login onLogin={(user) => {
      setCurrentUser(user)
      window.__CURRENT_USER__ = user
      if (user.grade === 'super_admin') setShowAdminPanel(true)
    }} />
  )
  if (showProfile) return <Profile user={currentUser} onBack={() => setShowProfile(false)} onUpdate={(updated) => setCurrentUser(updated)} />
  if (currentUser.grade === 'guest') return <GuestView currentUser={currentUser} />
  if (currentUser.is_first_login) return <Onboarding currentUser={currentUser} onComplete={(updated) => setCurrentUser(updated)} />

  return (
    <div style={{ display: 'flex', height: '100vh', userSelect: 'none' }}>

      {/* 점검 패널 (super_admin 전용, 앱 전체 왼쪽) */}
      {currentUser?.grade === 'super_admin' && (
        <>
          {/* 접기/펼치기 탭 버튼 */}
          <div
            onClick={() => setShowAdminPanel(prev => !prev)}
            style={{ position: 'fixed', left: showAdminPanel ? '300px' : '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 300, background: '#1a1a2e', color: 'white', padding: '12px 6px', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: '11px', writingMode: 'vertical-rl', letterSpacing: '2px', transition: 'left 0.3s ease', userSelect: 'none' }}>
            {showAdminPanel ? '◀ 닫기' : '🔧 점검'}
          </div>

          {/* 점검 패널 본체 */}
          <div style={{ width: showAdminPanel ? '300px' : '0px', overflow: 'hidden', transition: 'width 0.3s ease', flexShrink: 0, background: '#1a1a2e', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 200 }}>
            {showAdminPanel && <AdminPanel currentUser={currentUser} apiUrl={getApiUrl()} />}
          </div>
        </>
      )}

      {/* 앱 본체 (헤더 + 본문 세로 배치) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

          {/* 1행 - 로고 */}
          <div style={{ height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <img src="ilpoom.png" alt="앱 로고" style={{ height: '80px', objectFit: 'contain' }} />
            <img src="company.png" alt="회사 로고" style={{ height: '75px', objectFit: 'contain' }} />
          </div>

          {/* 2행 - 탭 + 유저 */}
          <div style={{ height: '40px', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '4px' }}>
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: activeTab === tab ? 'var(--accent-light)' : 'transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text-sub)', fontWeight: activeTab === tab ? '500' : '400', fontSize: 'var(--font-size)', cursor: 'pointer' }}>
                {tab}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => {
                if (!showUpdateLog) {
                  fetch(`${getApiUrl()}/announcements`)
                    .then(r => r.json())
                    .then(data => {
                      if (Array.isArray(data))
                        setUpdateLogs(data.filter(a => a.title.startsWith('[업데이트]')))
                    })
                }
                setShowUpdateLog(prev => !prev)
              }} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
                📋 업데이트 내역
              </button>
              <button onClick={() => setShowProfile(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }}></span>
                {currentUser?.name} · {currentUser?.dept}
              </button>
              <button
                onClick={() => {
                  fetch(`${getApiUrl()}/users/logout/${currentUser.id}`, { method: 'POST' })
                  setCurrentUser(null)
                }}
                style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>
                로그아웃
              </button>
            </div>
            {/* 업데이트 내역 모달 */}
            {showUpdateLog && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowUpdateLog(false)}>
                <div style={{ background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '480px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '15px', fontWeight: '600' }}>📋 업데이트 내역</p>
                    <button onClick={() => setShowUpdateLog(false)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa' }}>✕</button>
                  </div>
                  <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {updateLogs.length === 0 ? (
                      <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px' }}>아직 업데이트 내역이 없어요</p>
                    ) : updateLogs.map(log => (
                      <div key={log.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>{log.title.replace('[업데이트] ', '')}</p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.created_at}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-sub)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{log.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, background: activeTab === '메신저' ? 'var(--surface)' : 'var(--bg)', overflow: activeTab === '메신저' ? 'hidden' : 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>

            {activeTab === '내 워크스페이스' && (
              <Workspace
                currentUser={currentUser}
                onNavigate={(tab, subTab) => {
                  setActiveTab(tab)
                  if (subTab) setMessengerSubTab(subTab)
                }}
                onOpenChat={(user) => { setSideChat(user); setSideRoom(null) }}
                sideChat={sideChat}
                onFilesChange={(files) => setWorkspaceFiles(files)}
                initialTab={workspaceSubTab}
                onTabLoaded={() => setWorkspaceSubTab(null)}
                onFloatMemo={(memo, form) => setFloatingMemos(prev => [...prev, { ...memo, ...form, floatId: Date.now(), x: 200, y: 100, width: 420, height: 520 }])}
                memoRefreshTick={memoRefreshTick}
                dockMemo={dockMemo}
                onDockComplete={() => setDockMemo(null)}
                isDraggingMemo={isDraggingMemo}
                onOpenRoom={(room) => { setSideRoom(room); setSideChat(null) }}
              />
            )}

            {activeTab === '메신저' && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
                <Messenger
                  currentUser={currentUser}
                  onFloatChat={(chat) => setFloatingChats((prev) => [...prev, chat])}
                  showCreateRoom={showCreateRoom}
                  onCloseCreateRoom={() => setShowCreateRoom(false)}
                  onOpenCreateRoom={() => setShowCreateRoom(true)}
                  initialTab={messengerSubTab}
                  onTabLoaded={() => setMessengerSubTab(null)}
                  sideChat={sideChat}
                  onOpenChat={(user) => setSideChat(user)}
                  onCloseChat={() => setSideChat(null)}
                  sideRoom={sideRoom}
                  onOpenRoom={(room) => { setSideRoom(room); setSideChat(null) }}
                  onCloseRoom={() => setSideRoom(null)}
                  onFavChange={fetchFavorites}
                  favRefreshTick={favRefreshTick}
                />
              </div>
            )}

            {activeTab === '서버 저장소' && <ServerStorage currentUser={currentUser} />}
            {activeTab === '시스템 설정' && <SystemSettings currentUser={currentUser} />}
            {activeTab === '인사 관리' && <HRManagement currentUser={currentUser} />}
            {activeTab === '파일 관리' && <FileManagement currentUser={currentUser} />}
          </div>

          {/* 사이드 채팅창 */}
          {sideChat && (
            <>
              <div onMouseDown={handleSideChatResize}
                style={{ width: '5px', background: 'var(--border)', cursor: 'col-resize', flexShrink: 0 }} />
              <div style={{ width: `${sideChatWidth}px`, flexShrink: 0 }}>
                <ChatPanel
                  key={sideChat.id}
                  user={sideChat}
                  currentUser={currentUser}
                  onClose={() => setSideChat(null)}
                  isFloating={false}
                  onOpenFolder={() => { setActiveTab('내 워크스페이스'); setWorkspaceSubTab('folders') }}
                  onHeaderMouseDown={(e) => {
                    const startX = e.clientX
                    const startY = e.clientY
                    const onMove = (moveE) => {
                      const dx = moveE.clientX - startX
                      const dy = moveE.clientY - startY
                      if (Math.sqrt(dx * dx + dy * dy) > 8) {
                        setFloatingChats(prev => [...prev, { ...sideChat, floatId: Date.now(), x: moveE.clientX - 150, y: moveE.clientY - 20, width: 300, height: 420 }])
                        setSideChat(null)
                        window.removeEventListener('mousemove', onMove)
                      }
                    }
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                    window.addEventListener('mousemove', onMove)
                    window.addEventListener('mouseup', onUp)
                  }}
                  workspaceFiles={workspaceFiles}
                  isFav={favUsers.includes(sideChat?.id)}
                  onToggleFav={() => {
                    const isFav = favUsers.includes(sideChat.id)
                    fetch(`${getApiUrl()}/favorites`, {
                      method: isFav ? 'DELETE' : 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: currentUser.id, type: 'user', target_id: sideChat.id })
                    }).then(() => { fetchFavorites(); setFavRefreshTick(t => t + 1) })
                  }}
                />
              </div>
            </>
          )}

          {/* 사이드 협업방 */}
          {sideRoom && (
            <>
              <div onMouseDown={handleSideChatResize}
                style={{ width: '5px', background: '#eee', cursor: 'col-resize', flexShrink: 0 }} />
              <div style={{ width: `${sideChatWidth}px`, flexShrink: 0 }}>
                <RoomPanel
                  key={sideRoom.id}
                  room={sideRoom}
                  currentUser={currentUser}
                  onClose={() => setSideRoom(null)}
                  onLeave={() => setSideRoom(null)}
                  isFloating={false}
                  onHeaderMouseDown={() => {}}
                  workspaceFiles={workspaceFiles}
                  onOpenFolder={() => { setActiveTab('내 워크스페이스'); setWorkspaceSubTab('folders') }}
                  isFav={favRooms.includes(sideRoom?.id)}
                  onToggleFav={() => {
                    const isFav = favRooms.includes(sideRoom.id)
                    fetch(`${getApiUrl()}/favorites`, {
                      method: isFav ? 'DELETE' : 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: currentUser.id, type: 'room', target_id: sideRoom.id })
                    }).then(() => { fetchFavorites(); setFavRefreshTick(t => t + 1) })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 신규 회원 추가 모달 */}
      {showAddMember && <AddMember onClose={() => setShowAddMember(false)} />}

      {/* 플로팅 채팅창들 */}
      {floatingChats.map((chat) => (
        <div key={chat.floatId}
          style={{ position: 'fixed', left: chat.x, top: chat.y, width: `${chat.width}px`, height: `${chat.height}px`, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: `0 8px 24px var(--shadow)`, zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {chat.isRoom ? (
            <RoomPanel room={chat} currentUser={currentUser}
              onClose={() => setFloatingChats((prev) => prev.filter((c) => c.floatId !== chat.floatId))}
              onLeave={() => setFloatingChats((prev) => prev.filter((c) => c.floatId !== chat.floatId))}
              isFloating={true}
              onOpenFolder={() => { setActiveTab('내 워크스페이스'); setWorkspaceSubTab('folders') }}
              onHeaderMouseDown={(e) => {
                e.stopPropagation()
                const startX = e.clientX - chat.x
                const startY = e.clientY - chat.y
                const onMove = (moveE) => setFloatingChats((prev) => prev.map((c) => c.floatId === chat.floatId ? { ...c, x: moveE.clientX - startX, y: moveE.clientY - startY } : c))
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
              workspaceFiles={workspaceFiles}
            />
          ) : (
            <ChatPanel user={chat} currentUser={currentUser}
              onClose={() => setFloatingChats((prev) => prev.filter((c) => c.floatId !== chat.floatId))}
              isFloating={true}
              onOpenFolder={() => { setActiveTab('내 워크스페이스'); setWorkspaceSubTab('folders') }}
              onHeaderMouseDown={(e) => {
                e.stopPropagation()
                const startX = e.clientX - chat.x
                const startY = e.clientY - chat.y
                const onMove = (moveE) => setFloatingChats((prev) => prev.map((c) => c.floatId === chat.floatId ? { ...c, x: moveE.clientX - startX, y: moveE.clientY - startY } : c))
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
              workspaceFiles={workspaceFiles}
            />
          )}
          {/* 크기 조절 핸들 */}
          {[
            { cursor: 'n-resize',  top: 0,    left: 8,   right: 8,  height: '6px', dx: 0,  dy: -1 },
            { cursor: 's-resize',  bottom: 0, left: 8,   right: 8,  height: '6px', dx: 0,  dy: 1  },
            { cursor: 'w-resize',  top: 8,    left: 0,   bottom: 8, width: '6px',  dx: -1, dy: 0  },
            { cursor: 'e-resize',  top: 8,    right: 0,  bottom: 8, width: '6px',  dx: 1,  dy: 0  },
            { cursor: 'nw-resize', top: 0,    left: 0,   width: '12px', height: '12px', dx: -1, dy: -1 },
            { cursor: 'ne-resize', top: 0,    right: 0,  width: '12px', height: '12px', dx: 1,  dy: -1 },
            { cursor: 'sw-resize', bottom: 0, left: 0,   width: '12px', height: '12px', dx: -1, dy: 1  },
            { cursor: 'se-resize', bottom: 0, right: 0,  width: '12px', height: '12px', dx: 1,  dy: 1  },
          ].map((handle, i) => (
            <div key={i}
              style={{ position: 'absolute', ...handle, cursor: handle.cursor, background: 'transparent', zIndex: 10 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                const startX = e.clientX, startY = e.clientY
                const startW = chat.width, startH = chat.height
                const startLeft = chat.x, startTop = chat.y
                const onMove = (moveE) => {
                  const dx = moveE.clientX - startX, dy = moveE.clientY - startY
                  setFloatingChats((prev) => prev.map((c) => {
                    if (c.floatId !== chat.floatId) return c
                    let newW = startW, newH = startH, newX = startLeft, newY = startTop
                    if (handle.dx === 1)  newW = Math.max(300, startW + dx)
                    if (handle.dx === -1) { newW = Math.max(300, startW - dx); newX = startLeft + startW - newW }
                    if (handle.dy === 1)  newH = Math.max(360, startH + dy)
                    if (handle.dy === -1) { newH = Math.max(360, startH - dy); newY = startTop + startH - newH }
                    return { ...c, width: newW, height: newH, x: newX, y: newY }
                  }))
                }
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
            />
          ))}
        </div>
      ))}

      {/* 플로팅 메모 */}
      {floatingMemos.map((memo) => (
        <div key={memo.floatId}
          style={{ position: 'fixed', left: memo.x, top: memo.y, width: `${memo.width}px`, height: `${memo.height}px`, background: memo.color || '#FAEEDA', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column', pointerEvents: memo.isDragging ? 'none' : 'auto' }}>
          <MemoPanel
            memo={memo}
            currentUser={currentUser}
            onClose={() => setFloatingMemos(prev => prev.filter(m => m.floatId !== memo.floatId))}
            isFloating={true}
            onHeaderMouseDown={(e) => {
              e.stopPropagation()
              const startX = e.clientX - memo.x
              const startY = e.clientY - memo.y
              setIsDraggingMemo(true)
              setFloatingMemos(prev => prev.map(m => m.floatId === memo.floatId ? { ...m, isDragging: true } : m))
              const onMove = (moveE) => {
                setFloatingMemos(prev => prev.map(m =>
                  m.floatId === memo.floatId ? { ...m, x: moveE.clientX - startX, y: moveE.clientY - startY } : m
                ))
              }
              const onUp = (upE) => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
                setIsDraggingMemo(false)
                setFloatingMemos(prev => prev.map(m => m.floatId === memo.floatId ? { ...m, isDragging: false } : m))
                const el = document.elementFromPoint(upE.clientX, upE.clientY)
                if (el?.closest('[data-memo-dropzone]')) {
                  setFloatingMemos(prev => prev.filter(m => m.floatId !== memo.floatId))
                  setActiveTab('내 워크스페이스')
                  setWorkspaceSubTab('memos')
                  setDockMemo(memo)
                }
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
            onSaved={() => setMemoRefreshTick(t => t + 1)}
          />
          {/* 크기 조절 핸들 */}
          {[
            { cursor: 'se-resize', bottom: 0, right: 0, width: '12px', height: '12px', dx: 1, dy: 1 },
            { cursor: 's-resize', bottom: 0, left: 8, right: 8, height: '6px', dx: 0, dy: 1 },
            { cursor: 'e-resize', top: 8, right: 0, bottom: 8, width: '6px', dx: 1, dy: 0 },
          ].map((handle, i) => (
            <div key={i}
              style={{ position: 'absolute', ...handle, cursor: handle.cursor, background: 'transparent', zIndex: 10 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                const startX = e.clientX, startY = e.clientY
                const startW = memo.width, startH = memo.height
                const onMove = (moveE) => {
                  const dx = moveE.clientX - startX, dy = moveE.clientY - startY
                  setFloatingMemos(prev => prev.map(m => m.floatId !== memo.floatId ? m : {
                    ...m,
                    width: handle.dx ? Math.max(320, startW + dx) : startW,
                    height: handle.dy ? Math.max(400, startH + dy) : startH,
                  }))
                }
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default App