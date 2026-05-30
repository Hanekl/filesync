import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

const statusColor = { online: '#1D9E75', away: '#EF9F27', offline: '#ccc' }

function UserItem({ user, currentUser, openChat, onClick, onToggleFav, isFav, onContextMenu, isNotify, onToggleNotify}) { 
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', background: openChat?.id === user.id ? 'var(--accent-light)' : 'transparent' }}
      onMouseEnter={(e) => e.currentTarget.style.background = openChat?.id === user.id ? 'var(--accent-light)' : 'var(--surface-alt)'}
      onMouseLeave={(e) => e.currentTarget.style.background = openChat?.id === user.id ? 'var(--accent-light)' : 'transparent'}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--accent)' }}>
          {user.name[0]}
        </div>
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: statusColor[user.status] || '#ccc', border: '2px solid var(--surface)' }}></span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{user.name}</p>
          {user.unread_count > 0 && (
            <span style={{ background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', padding: '1px 5px', fontSize: 'var(--font-size-sm)' }}>
              {user.unread_count}
            </span>
          )}
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.last_message || `${user.dept} · ${user.role}`}
        </p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleNotify() }}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size)', color: isNotify ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }}>
        {isNotify ? '🔔' : '🔕'}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav() }}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: isFav ? '#EF9F27' : 'var(--border)', flexShrink: 0 }}>
          {isFav ? '★' : '☆'}
      </button>
    </div>
  )
}

function Messenger({ currentUser, onFloatChat, showCreateRoom, onCloseCreateRoom, onOpenCreateRoom, initialTab, onTabLoaded, sideChat, onOpenChat, onCloseChat, sideRoom, onOpenRoom, onCloseRoom, onFavChange, favRefreshTick }) {
  const [users, setUsers] = useState([])

  const fetchUsers = () => {
    fetch(`${getApiUrl()}/users/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => {
            const order = { online: 0, away: 1, offline: 2 }
            return (order[a.status] ?? 2) - (order[b.status] ?? 2)
          })
          setUsers(sorted)
        }
      })
  }

  const fetchRooms = () => {
    fetch(`${getApiUrl()}/rooms/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRooms(data)
      })
  }

  const fetchFavorites = () => {
    fetch(`${getApiUrl()}/favorites/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        setFavUsers(data.filter(f => f.type === 'user').map(f => f.target_id))
        setFavRooms(data.filter(f => f.type === 'room').map(f => f.target_id))
        setFavDepts(data.filter(f => f.type === 'dept').map(f => f.target_name))
      })
  }

  const toggleFavUser = (userId) => {
    const isFav = favUsers.includes(userId)
    setFavUsers(prev => isFav ? prev.filter(id => id !== userId) : [...prev, userId])
    onFavChange?.()
    fetch(`${getApiUrl()}/favorites`, {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, type: 'user', target_id: userId })
    })
  }

  const toggleFavDept = (dept) => {
    const isFav = favDepts.includes(dept)
    if (isFav) {
      fetch(`${getApiUrl()}/favorites`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, type: 'dept', target_name: dept }) }).then(() => fetchFavorites())
    } else {
      fetch(`${getApiUrl()}/favorites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, type: 'dept', target_name: dept }) }).then(() => fetchFavorites())
    }
  }

  const [muteUsers, setMuteUsers] = useState(() => { const saved = localStorage.getItem('mute_users'); return saved ? JSON.parse(saved) : [] })
  const [muteRooms, setMuteRooms] = useState(() => { const saved = localStorage.getItem('mute_rooms'); return saved ? JSON.parse(saved) : [] })

  const toggleNotifyUser = (userId) => {
    const isMuted = muteUsers.includes(userId)
    const newList = isMuted ? muteUsers.filter(id => id !== userId) : [...muteUsers, userId]
    setMuteUsers(newList)
    localStorage.setItem('mute_users', JSON.stringify(newList))
    localStorage.setItem(`notify_dm_${userId}`, String(isMuted))
    window.dispatchEvent(new Event('storage'))
  }

  const toggleNotifyRoom = (roomId) => {
    const isMuted = muteRooms.includes(roomId)
    const newList = isMuted ? muteRooms.filter(id => id !== roomId) : [...muteRooms, roomId]
    setMuteRooms(newList)
    localStorage.setItem('mute_rooms', JSON.stringify(newList))
    localStorage.setItem(`notify_room_${roomId}`, String(isMuted))
    window.dispatchEvent(new Event('storage'))
  }

  const toggleCollapse = (dept) => {
    setCollapsedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])
  }

  const [activeTab, setActiveTab] = useState('chat')
  useEffect(() => {
    if (initialTab) { setActiveTab(initialTab); if (onTabLoaded) onTabLoaded() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  const [favUsers, setFavUsers] = useState([])
  const [favRooms, setFavRooms] = useState([])
  const [favDepts, setFavDepts] = useState([])
  const [collapsedDepts, setCollapsedDepts] = useState([])
  const [selectedDept, setSelectedDept] = useState('전체')
  const [openChat, setOpenChat] = useState(null)
  const [rooms, setRooms] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [selectedAnn, setSelectedAnn] = useState(null)
  const [showCreateAnn, setShowCreateAnn] = useState(false)
  const [annForm, setAnnForm] = useState({ title: '', content: '', is_urgent: false, urgent_days: 1 })
  const [userReactions, setUserReactions] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [annSearch, setAnnSearch] = useState('')

  const searchedUsers = searchQuery.trim() ? users.filter(u => u.name.includes(searchQuery) || u.dept.includes(searchQuery)) : null
  const filteredAnns = annSearch.trim() ? announcements.filter(a => a.title.includes(annSearch) || a.content?.includes(annSearch)) : announcements

  const fetchAnnouncements = () => {
    fetch(`${getApiUrl()}/announcements`).then(r => r.json()).then(data => { if (Array.isArray(data)) setAnnouncements(data) })
  }

  useEffect(() => {
    fetchUsers(); fetchRooms(); fetchFavorites(); fetchAnnouncements()
    const usersInterval = setInterval(fetchUsers, 3000)
    const roomsInterval = setInterval(fetchRooms, 3000)
    const annInterval = setInterval(fetchAnnouncements, 3000)
    const favInterval = setInterval(fetchFavorites, 3000)
    return () => { clearInterval(usersInterval); clearInterval(roomsInterval); clearInterval(annInterval); clearInterval(favInterval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReact = (annId, reaction) => {
    const key = `${annId}_${reaction}`
    const isReacted = userReactions[key]
    const myCurrentReaction = Object.keys(userReactions).find(k => k.startsWith(`${annId}_`) && userReactions[k])?.replace(`${annId}_`, '')
    setUserReactions(prev => {
      const newReactions = { ...prev }
      Object.keys(newReactions).forEach(k => { if (k.startsWith(`${annId}_`)) delete newReactions[k] })
      if (!isReacted) newReactions[key] = true
      return newReactions
    })
    setAnnouncements(prev => prev.map(ann => {
      if (ann.id !== annId) return ann
      const newReactionCounts = { ...ann.reactions }
      if (myCurrentReaction) {
        newReactionCounts[myCurrentReaction] = Math.max(0, (newReactionCounts[myCurrentReaction] || 0) - 1)
        if (newReactionCounts[myCurrentReaction] === 0) delete newReactionCounts[myCurrentReaction]
      }
      if (!isReacted) newReactionCounts[reaction] = (newReactionCounts[reaction] || 0) + 1
      return { ...ann, reactions: newReactionCounts }
    }))
    fetch(`${getApiUrl()}/announcements/${annId}/react?user_id=${currentUser.id}&reaction=${reaction}`, { method: 'POST' })
  }

  const handleCreateAnn = () => {
    if (!annForm.title.trim() || !annForm.content.trim()) return
    fetch(`${getApiUrl()}/announcements/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...annForm, author_id: currentUser.id })
    }).then(() => { fetchAnnouncements(); setShowCreateAnn(false); setAnnForm({ title: '', content: '', is_urgent: false, urgent_days: 1 }) })
  }

  const toggleFavRoom = (roomId) => {
    const isFav = favRooms.includes(roomId)
    setFavRooms(prev => isFav ? prev.filter(id => id !== roomId) : [...prev, roomId])
    onFavChange?.()
    fetch(`${getApiUrl()}/favorites`, {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, type: 'room', target_id: roomId })
    })
  }

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('mute_users')
      if (saved) setMuteUsers(JSON.parse(saved))
      const savedRooms = localStorage.getItem('mute_rooms')
      if (savedRooms) setMuteRooms(JSON.parse(savedRooms))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [sharedFiles, setSharedFiles] = useState([])
  useEffect(() => {
    fetch(`${getApiUrl()}/messages/shared/${currentUser.id}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setSharedFiles(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (favRefreshTick > 0) fetchFavorites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favRefreshTick])

  const openRoom = sideRoom
  const setOpenRoom = (room) => room ? onOpenRoom?.(room) : onCloseRoom?.()
  const [newRoomName, setNewRoomName] = useState('')
  const [roomNameError, setRoomNameError] = useState('')
  const [memberError, setMemberError] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [collapsedModalDepts, setCollapsedModalDepts] = useState([...new Set(users.map(u => u.dept))])

  const inputStyle = { width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', background: 'var(--surface-alt)', color: 'var(--text)' }
  const modalStyle = { background: 'var(--surface)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }
  const btnPrimary = { padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }
  const btnSecondary = { padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>

      {/* 왼쪽 - 탭 + 목록 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRight: openChat ? `1px solid var(--border)` : 'none' }}>

        {/* 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { key: 'chat', label: '친구' },
            { key: 'rooms', label: '협업방' },
            { key: 'notice', label: '공지' },
            { key: 'files', label: '공유 파일' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === tab.key ? '500' : '400' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 친구 탭 */}
        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="이름, 부서 검색..." style={inputStyle} />
            </div>

            {searchedUsers ? (
              <div style={{ flex: 1, overflow: 'auto' }}>
                {searchedUsers.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🔍</span>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>"{searchQuery}" 검색 결과가 없어요</p>
                  </div>
                ) : searchedUsers.map(user => (
                  <UserItem key={user.id} user={user} currentUser={currentUser} openChat={openChat}
                    isFav={favUsers.includes(user.id)}
                    onClick={() => { setOpenChat(user); setOpenRoom(null); onOpenChat?.(user); setUsers(prev => prev.map(u => u.id === user.id ? { ...u, unread_count: 0 } : u)) }}
                    onToggleFav={() => toggleFavUser(user.id)}
                    isNotify={!muteUsers.includes(user.id)}
                    onToggleNotify={() => toggleNotifyUser(user.id)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* 부서 필터 탭 */}
                <div style={{ display: 'flex', gap: '4px', padding: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                  {['전체', ...favDepts, ...[...new Set(users.map(u => u.dept))].filter(d => !favDepts.includes(d))].map(dept => (
                    <button key={dept} onClick={() => setSelectedDept(dept)}
                      style={{ padding: '3px 8px', borderRadius: '10px', border: 'none', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: selectedDept === dept ? 'var(--accent)' : 'var(--surface-alt)', color: selectedDept === dept ? 'var(--accent-text)' : 'var(--text-sub)' }}>
                      {favDepts.includes(dept) && dept !== '전체' ? '⭐ ' : ''}{dept}
                    </button>
                  ))}
                </div>

                {/* 전체 탭 */}
                {selectedDept === '전체' && (
                  <>
                    {users.filter(u => favUsers.includes(u.id)).length > 0 && (
                      <div>
                        <div style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500' }}>⭐ 즐겨찾기</div>
                        {users.filter(u => favUsers.includes(u.id)).map(user => (
                          <UserItem key={`fav-${user.id}`} user={user} currentUser={currentUser} openChat={openChat}
                            isFav={true}
                            onClick={() => { setOpenChat(user); setOpenRoom(null); onOpenChat?.(user); setUsers(prev => prev.map(u => u.id === user.id ? { ...u, unread_count: 0 } : u)) }}
                            onToggleFav={() => toggleFavUser(user.id)}
                            isNotify={!muteUsers.includes(user.id)}
                            onToggleNotify={() => toggleNotifyUser(user.id)}
                          />
                        ))}
                        <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                      </div>
                    )}

                    {[...new Set(users.map(u => u.dept))].sort((a, b) => { if (a === currentUser.dept) return -1; if (b === currentUser.dept) return 1; return 0 }).map(dept => (
                      <div key={dept}>
                        <div onClick={() => toggleCollapse(dept)}
                          style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', background: 'var(--surface-alt)' }}>
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', flex: 1, fontWeight: '500' }}>
                            {collapsedDepts.includes(dept) ? '▶' : '▼'} {dept}
                            {dept === currentUser.dept && (
                              <span style={{ marginLeft: '6px', fontSize: 'var(--font-size-sm)', padding: '1px 6px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '8px' }}>내 부서</span>
                            )}
                          </span>
                          <button onClick={() => toggleFavDept(dept)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>
                            {favDepts.includes(dept) ? '⭐' : '☆'}
                          </button>
                        </div>
                        {!collapsedDepts.includes(dept) && users.filter(u => u.dept === dept).map(user => (
                          <UserItem key={user.id} user={user} currentUser={currentUser} openChat={openChat}
                            isFav={favUsers.includes(user.id)}
                            onClick={() => { setOpenChat(user); setOpenRoom(null); onOpenChat?.(user) }}
                            onToggleFav={() => toggleFavUser(user.id)}
                            isNotify={!muteUsers.includes(user.id)}
                            onToggleNotify={() => toggleNotifyUser(user.id)}
                          />
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {/* 부서 필터 */}
                {selectedDept !== '전체' && (
                  <div>
                    {users.filter(u => u.dept === selectedDept).sort((a, b) => favUsers.includes(b.id) - favUsers.includes(a.id)).map(user => (
                      <UserItem key={user.id} user={user} currentUser={currentUser} openChat={openChat}
                        isFav={favUsers.includes(user.id)}
                        onClick={() => { setOpenChat(user); setOpenRoom(null); onOpenChat?.(user) }}
                        onToggleFav={() => toggleFavUser(user.id)}
                        isNotify={!muteUsers.includes(user.id)}
                        onToggleNotify={() => toggleNotifyUser(user.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 협업방 탭 */}
        {activeTab === 'rooms' && (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => onOpenCreateRoom?.()}
                style={{ width: '100%', padding: '8px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                + 협업방 만들기
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {rooms.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>💬</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>참여 중인 협업방이 없어요</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>새 협업방을 만들어보세요!</p>
                </div>
              ) : [...rooms].sort((a, b) => favRooms.includes(b.id) - favRooms.includes(a.id)).map((room) => (
                <div key={room.id}
                  onClick={() => { setOpenRoom(room); setOpenChat(null); onCloseChat?.(); setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r)) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', background: openRoom?.id === room.id ? 'var(--accent-light)' : 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = openRoom?.id === room.id ? 'var(--accent-light)' : 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = openRoom?.id === room.id ? 'var(--accent-light)' : 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏠</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{room.name}</p>
                      {room.unread_count > 0 && (
                        <span style={{ background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', padding: '1px 5px', fontSize: 'var(--font-size-sm)' }}>
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.lastMessage || `${room.members?.length || 0}명`}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleNotifyRoom(room.id) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size)', color: !muteRooms.includes(room.id) ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }}>
                    {!muteRooms.includes(room.id) ? '🔔' : '🔕'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavRoom(room.id) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: favRooms.includes(room.id) ? '#EF9F27' : 'var(--border)', flexShrink: 0 }}>
                    {favRooms.includes(room.id) ? '★' : '☆'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 공지 탭 */}
        {activeTab === 'notice' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>공지사항 {filteredAnns.length}개</p>
              {(currentUser?.permissions?.includes('announce_write') || currentUser?.grade === 'super_admin') && (
                <button onClick={() => setShowCreateAnn(true)}
                  style={{ padding: '6px 12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                  + 공지 작성
                </button>
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input value={annSearch} onChange={e => setAnnSearch(e.target.value)} placeholder="공지사항 검색..." style={inputStyle} />
            </div>

            {/* 긴급 공지 */}
            {filteredAnns.filter(a => a.is_urgent).length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)', fontWeight: '500', marginBottom: '6px' }}>🚨 긴급 공지</p>
                {filteredAnns.filter(a => a.is_urgent).map(ann => (
                  <div key={ann.id} onClick={() => setSelectedAnn(ann.id)}
                    style={{ background: 'var(--red-light)', border: `1px solid var(--red)`, borderRadius: '10px', padding: '12px 14px', marginBottom: '6px', cursor: 'pointer', opacity: 0.9 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', background: 'var(--red)', color: 'white', padding: '1px 6px', borderRadius: '6px', fontWeight: '500' }}>긴급</span>
                      <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{ann.title}</p>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{ann.author} · {ann.created_at}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 일반 공지 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredAnns.filter(a => !a.is_urgent).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>📢</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>
                    {annSearch ? `"${annSearch}" 검색 결과가 없어요` : '아직 공지사항이 없어요'}
                  </p>
                </div>
              ) : filteredAnns.filter(a => !a.is_urgent).map(ann => (
                <div key={ann.id} onClick={() => setSelectedAnn(ann.id)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {ann.was_urgent && (
                      <span style={{ fontSize: 'var(--font-size-sm)', background: 'var(--surface-alt)', color: 'var(--text-sub)', padding: '1px 6px', borderRadius: '6px' }}>긴급해제</span>
                    )}
                    <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{ann.title}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{ann.author} · {ann.created_at}</p>
                    {Object.keys(ann.reactions || {}).length > 0 && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Object.entries(ann.reactions).map(([r, count]) => (
                          <span key={r} style={{ fontSize: 'var(--font-size-sm)', background: 'var(--surface-alt)', color: 'var(--text-sub)', padding: '1px 6px', borderRadius: '8px' }}>{r} {count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 공지 상세 모달 */}
            {selectedAnn && (() => {
              const ann = filteredAnns.find(a => a.id === selectedAnn)
              if (!ann) return null
              return (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setSelectedAnn(null)}>
                  <div style={{ ...modalStyle, width: '420px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ann.is_urgent && <span style={{ fontSize: 'var(--font-size-sm)', background: 'var(--red)', color: 'white', padding: '2px 8px', borderRadius: '6px' }}>긴급</span>}
                      {!ann.is_urgent && ann.was_urgent && <span style={{ fontSize: 'var(--font-size-sm)', background: 'var(--surface-alt)', color: 'var(--text-sub)', padding: '2px 8px', borderRadius: '6px' }}>긴급해제</span>}
                      <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>{ann.title}</p>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{ann.author} · {ann.created_at}</p>
                    <div style={{ height: '1px', background: 'var(--border)' }} />
                    <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{ann.content}</p>
                    <div style={{ height: '1px', background: 'var(--border)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>공감</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['👍', '❤️', '👀', '✅', '😮'].map(r => {
                          const key = `${ann.id}_${r}`
                          const count = ann.reactions?.[r] || 0
                          const reacted = userReactions[key]
                          return (
                            <button key={r} onClick={() => handleReact(selectedAnn, r)}
                              style={{ padding: '6px 12px', border: `1px solid ${reacted ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '20px', background: reacted ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text)' }}>
                              {r} {count > 0 && count}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <button onClick={() => setSelectedAnn(null)} style={btnSecondary}>닫기</button>
                  </div>
                </div>
              )
            })()}

            {/* 공지 작성 모달 */}
            {showCreateAnn && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowCreateAnn(false)}>
                <div style={{ ...modalStyle, width: '420px' }} onClick={e => e.stopPropagation()}>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>공지 작성</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>제목</label>
                      <input value={annForm.title} onChange={e => setAnnForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="공지 제목 입력" style={{ ...inputStyle, padding: '8px 12px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>내용</label>
                      <textarea value={annForm.content} onChange={e => setAnnForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="공지 내용 입력" rows={5}
                        style={{ ...inputStyle, padding: '8px 12px', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: annForm.is_urgent ? 'var(--red-light)' : 'var(--surface-alt)', borderRadius: '8px', border: `1px solid ${annForm.is_urgent ? 'var(--red)' : 'var(--border)'}` }}>
                      <input type="checkbox" id="urgent" checked={annForm.is_urgent} onChange={e => setAnnForm(prev => ({ ...prev, is_urgent: e.target.checked }))} />
                      <label htmlFor="urgent" style={{ fontSize: 'var(--font-size)', cursor: 'pointer', flex: 1, color: 'var(--text)' }}>🚨 긴급 공지로 설정</label>
                      {annForm.is_urgent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select value={annForm.urgent_days} onChange={e => setAnnForm(prev => ({ ...prev, urgent_days: parseInt(e.target.value) }))}
                            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}>
                            <option value={1}>1일</option>
                            <option value={2}>2일</option>
                            <option value={3}>3일</option>
                          </select>
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>후 해제</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setShowCreateAnn(false); setAnnForm({ title: '', content: '', is_urgent: false, urgent_days: 1 }) }} style={{ ...btnSecondary, flex: 1 }}>취소</button>
                    <button onClick={handleCreateAnn} style={{ ...btnPrimary, flex: 1, background: annForm.is_urgent ? 'var(--red)' : 'var(--accent)' }}>
                      {annForm.is_urgent ? '🚨 긴급 공지 올리기' : '공지 올리기'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 공유 파일 탭 */}
        {activeTab === 'files' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '4px' }}>최근 공유된 파일</p>
            {sharedFiles.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>공유된 파일이 없어요</p>
            ) : sharedFiles.map((file) => (
              <div key={file.message_id}
                style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>📎</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text)' }}>{file.file_name}</span>
                  <button onClick={() => {
                    fetch(`${getApiUrl()}/user-files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, file_id: file.file_id }) })
                      .then(() => alert('내 워크스페이스에 추가됐어요!'))
                  }} style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent)', flexShrink: 0 }}>
                    ➕
                  </button>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{file.sender} → {file.room_name} · {file.created_at}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 협업방 만들기 모달 */}
      {showCreateRoom && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...modalStyle, width: '320px' }}>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>협업방 만들기</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>방 이름</label>
              <input value={newRoomName} onChange={(e) => { setNewRoomName(e.target.value); setRoomNameError('') }}
                placeholder="협업방 이름 입력..."
                style={{ ...inputStyle, border: `1px solid ${roomNameError ? 'var(--red)' : 'var(--border)'}`, padding: '8px 12px' }} />
              {roomNameError && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)', marginTop: '4px' }}>{roomNameError}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>참여 인원 선택</label>
              {memberError && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--red)' }}>{memberError}</p>}
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {[...new Set(users.filter(u => u.id !== currentUser.id).map(u => u.dept))].map(dept => {
                  const deptUsers = users.filter(u => u.dept === dept && u.id !== currentUser.id)
                  const allSelected = deptUsers.every(u => selectedMembers.includes(u.name))
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-alt)', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                        <span onClick={() => setCollapsedModalDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                          style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-sub)', flex: 1 }}>
                          {collapsedModalDepts.includes(dept) ? '▶' : '▼'} {dept} ({deptUsers.length}명)
                        </span>
                        <button onClick={() => {
                          if (allSelected) { setSelectedMembers(prev => prev.filter(m => !deptUsers.map(u => u.name).includes(m))) }
                          else { setSelectedMembers(prev => [...new Set([...prev, ...deptUsers.map(u => u.name)])]) }
                        }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: allSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {allSelected ? '전체 해제' : '전체 선택'}
                        </button>
                      </div>
                      {!collapsedModalDepts.includes(dept) && deptUsers.map((user) => (
                        <div key={user.id}
                          onClick={() => setSelectedMembers((prev) => prev.includes(user.name) ? prev.filter((m) => m !== user.name) : [...prev, user.name])}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px 7px 20px', borderRadius: '8px', cursor: 'pointer', border: selectedMembers.includes(user.name) ? '1px solid var(--accent)' : '1px solid var(--border)', background: selectedMembers.includes(user.name) ? 'var(--accent-light)' : 'var(--surface)', marginBottom: '4px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
                            {user.name[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', color: 'var(--text)' }}>{user.name}</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{user.role}</p>
                          </div>
                          {selectedMembers.includes(user.name) && <span style={{ color: 'var(--accent)', fontSize: '14px' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onCloseCreateRoom(); setNewRoomName(''); setSelectedMembers([]); setRoomNameError(''); setMemberError('') }} style={{ ...btnSecondary, flex: 1 }}>취소</button>
              <button onClick={() => {
                if (!newRoomName.trim()) { setRoomNameError('협업방 이름을 입력해주세요!'); return }
                if (selectedMembers.length === 0) { setMemberError('참여 인원을 선택해주세요!'); return }
                setRoomNameError(''); setMemberError('')
                const memberIds = users.filter((u) => selectedMembers.includes(u.name)).map((u) => u.id)
                fetch(`${getApiUrl()}/rooms/create`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newRoomName, member_ids: [currentUser.id, ...memberIds] })
                }).then((res) => res.json()).then((data) => {
                  const newRoom = { id: data.room_id, name: newRoomName, members: [currentUser.name, ...selectedMembers], lastMessage: '협업방이 생성되었습니다.' }
                  setRooms((prev) => [...prev, newRoom])
                  setOpenRoom(newRoom)
                  onCloseCreateRoom()
                  setNewRoomName('')
                  setSelectedMembers([])
                })
              }} style={{ ...btnPrimary, flex: 1 }}>만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) 
}

export default Messenger