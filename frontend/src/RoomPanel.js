import { useState, useRef, useEffect } from 'react'
import { getApiUrl, getWsUrl } from './config'

const typeIcon = { pdf: '📄', doc: '📝', xls: '📊', ppt: '📑', default: '📎' }

function RoomPanel({ room, currentUser, onClose, onLeave, onHeaderMouseDown, isFloating, isFav, onToggleFav, workspaceFiles, onOpenFolder }) {
  const [messages, setMessages] = useState([])
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(`${getWsUrl()}/ws/${room.id}/${currentUser.id}`)

    ws.onopen = () => {
      console.log('협업방 연결됨!')
      fetch(`${getApiUrl()}/messages/read/${room.id}/${currentUser.id}`, {
        method: 'POST'
      })
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'read') {
        setMessages((prev) => prev.map((m) =>
          m.sender_id === currentUser.id ? { ...m, is_read: true } : m
        ))
        return
      }
      setMessages((prev) => [...prev, {
        id: msg.id,
        sender_id: msg.sender_id,
        sender: msg.sender_name || msg.sender_id,
        text: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        is_read: msg.is_read,
        isFile: msg.is_file,
        file_id: msg.file_id
      }])
    }

    wsRef.current = ws

    fetch(`${getApiUrl()}/messages/${room.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setMessages(data.map((m) => ({
          id: m.id,
          sender_id: m.sender_id,
          sender: m.sender_name || m.sender_id,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          is_read: m.is_read,
          isFile: m.is_file,
          file_id: m.file_id
        })))
      })

    return () => ws.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [files, setFiles] = useState([])
  const [showMembers, setShowMembers] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showSearch, setShowSearch] = useState(false)
  const [msgSearch, setMsgSearch] = useState('')

  // 파일 탭 API 연결
  useEffect(() => {
    if (activeTab !== 'files') return
    fetch(`${getApiUrl()}/messages/${room.id}`)
      .then(r => r.json())
      .then(msgs => {
        if (!Array.isArray(msgs)) return
        setFiles(msgs.filter(m => m.is_file).map(m => ({
          id: m.id,
          name: m.content,
          file_id: m.file_id,
          sender: m.sender_name || m.sender_id,
          time: new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        })))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(input)
    }
    setInput('')
  }

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files).map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      sender: currentUser.name,
    }))
    setFiles((prev) => [...prev, ...uploadedFiles])
    setMessages((prev) => [...prev, ...uploadedFiles.map((f) => ({
      id: f.id, sender_id: currentUser.id, sender: currentUser.name,
      text: `📎 ${f.name}`, time: f.time, isFile: true, url: f.url
    }))])
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const wsFile = window.__draggedWorkspaceFile
    if (wsFile) {
      window.__draggedWorkspaceFile = null
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "file",
          file_id: wsFile.file_id,
          file_name: wsFile.display_name
        }))
      }
      return
    }
    const droppedFiles = Array.from(e.dataTransfer.files).map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      sender: currentUser.name,
    }))
    if (droppedFiles.length === 0) return
    setFiles(prev => [...prev, ...droppedFiles])
    setMessages(prev => [...prev, ...droppedFiles.map(f => ({
      id: f.id, sender_id: currentUser.id, sender: currentUser.name,
      text: `📎 ${f.name}`, time: f.time, isFile: true, url: f.url
    }))])
  }

  const filteredMessages = msgSearch.trim()
    ? messages.filter(m => m.text?.includes(msgSearch))
    : messages

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white' }}>

      {/* 헤더 */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{ height: '44px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', flexShrink: 0, cursor: 'grab', background: isFloating ? '#f0effe' : 'white' }}
      >
        <span style={{ fontSize: '13px', fontWeight: '500', flex: 1, userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🏠 {room.name}
          <button onClick={(e) => { e.stopPropagation(); onToggleFav?.() }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: isFav ? '#EF9F27' : '#ddd', padding: 0 }}>
            {isFav ? '★' : '☆'}
          </button>
        </span>
        <button
          onClick={() => setShowMembers(!showMembers)}
          style={{ border: 'none', background: showMembers ? '#EEEDFE' : 'transparent', cursor: 'pointer', fontSize: '12px', color: showMembers ? '#3C3489' : '#888', padding: '4px 8px', borderRadius: '6px' }}>
          👥 {room.members.length}명
        </button>
        <button onClick={() => { setShowSearch(prev => !prev); setMsgSearch('') }}
          style={{ border: 'none', background: showSearch ? '#EEEDFE' : 'transparent', cursor: 'pointer', fontSize: '14px', color: showSearch ? '#534AB7' : '#bbb', padding: '4px 6px', borderRadius: '6px' }}>
          🔍
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#888' }}>✕
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 채팅 + 파일 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {showSearch && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', background: '#f8f8f8' }}>
              <input
                value={msgSearch}
                onChange={e => setMsgSearch(e.target.value)}
                placeholder="메시지 검색..."
                autoFocus
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #eee', borderRadius: '8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
              />
              {msgSearch && (
                <p style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>
                  {messages.filter(m => m.text?.includes(msgSearch)).length}개 검색됨
                </p>
              )}
            </div>
          )}

          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', flexShrink: 0 }}>
            <button onClick={() => setActiveTab('chat')}
              style={{ flex: 1, padding: '8px', border: 'none', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: activeTab === 'chat' ? '#534AB7' : '#888', borderBottom: activeTab === 'chat' ? '2px solid #534AB7' : 'none', fontWeight: activeTab === 'chat' ? '500' : '400' }}>
              대화
            </button>
            <button onClick={() => setActiveTab('files')}
              style={{ flex: 1, padding: '8px', border: 'none', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: activeTab === 'files' ? '#534AB7' : '#888', borderBottom: activeTab === 'files' ? '2px solid #534AB7' : 'none', fontWeight: activeTab === 'files' ? '500' : '400' }}>
              파일 {files.length > 0 && `(${files.length})`}
            </button>
          </div>

          {/* 대화 탭 */}
          {activeTab === 'chat' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                style={{ flex: 1, overflow: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
                  background: dragOver ? '#f0effe' : '#f8f8f8',
                  border: dragOver ? '2px dashed #534AB7' : '2px solid transparent',
                  boxSizing: 'border-box'
                }}
              >
                {filteredMessages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px' }}>
                      {!isMine && <span style={{ fontSize: '11px', color: '#aaa' }}>{msg.sender}</span>}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                        {msg.isFile ? (
                          <div style={{ padding: '10px 12px', borderRadius: '10px', background: isMine ? '#534AB7' : 'white', border: isMine ? 'none' : '1px solid #eee', minWidth: '160px', maxWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '20px' }}>📎</span>
                              <span style={{ fontSize: '12px', fontWeight: '500', color: isMine ? 'white' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.text}</span>
                            </div>
                            {!isMine && msg.file_id && (
                              <button onClick={() => {
                                fetch(`${getApiUrl()}/user-files`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ user_id: currentUser.id, file_id: msg.file_id })
                                }).then(() => alert('내 워크스페이스에 추가됐어요!'))
                              }}
                                style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '6px', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: '11px', color: '#534AB7' }}>
                                ➕ 워크스페이스에 추가
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word', background: isMine ? '#534AB7' : 'white', color: isMine ? 'white' : '#333', border: isMine ? 'none' : '1px solid #eee' }}>
                            {msgSearch && msg.text?.includes(msgSearch) ? (
                              <span>
                                {msg.text.split(msgSearch).map((part, i, arr) => (
                                  <span key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                      <span style={{ background: '#FFF176', borderRadius: '2px' }}>{msgSearch}</span>
                                    )}
                                  </span>
                                ))}
                              </span>
                            ) : msg.text}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px' }}>
                          <span style={{ fontSize: '10px', color: '#bbb' }}>{msg.time}</span>
                          {isMine && (
                            <span style={{ fontSize: '10px', color: msg.is_read ? '#534AB7' : '#bbb' }}>
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '6px', flexShrink: 0, position: 'relative' }}>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                <button
                  onClick={() => onOpenFolder?.()}
                  style={{ width: '32px', height: '32px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>
                  📎
                </button>
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="메시지 입력..."
                  style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', outline: 'none' }} />
                <button onClick={handleSend}
                  style={{ padding: '7px 12px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>전송</button>

                {/* 내 폴더 파일 선택 팝업 */}
                {showFilePicker && (
                  <div style={{ position: 'absolute', bottom: '52px', left: '10px', right: '10px', background: 'white', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '240px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#555' }}>📁 내 폴더에서 선택</p>
                      <button onClick={() => setShowFilePicker(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#aaa' }}>✕</button>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>
                      {!workspaceFiles?.length ? (
                        <p style={{ fontSize: '12px', color: '#aaa', padding: '20px', textAlign: 'center' }}>내 폴더에 파일이 없어요</p>
                      ) : workspaceFiles.map((file, i) => (
                        <div key={i}
                          onClick={() => {
                            if (wsRef.current?.readyState === WebSocket.OPEN) {
                              wsRef.current.send(JSON.stringify({
                                type: "file",
                                file_id: file.file_id,
                                file_name: file.display_name
                              }))
                            }
                            setShowFilePicker(false)
                          }}
                          style={{ padding: '9px 14px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize: '16px', flexShrink: 0 }}>{typeIcon[file.type] || typeIcon.default}</span>
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                            <p style={{ fontSize: '10px', color: '#aaa' }}>{file.from} · {file.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 파일 탭 */}
          {activeTab === 'files' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
              {files.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', marginTop: '40px' }}>공유된 파일이 없어요</p>
              ) : (
                files.map((file) => (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'white', border: '1px solid #eee', borderRadius: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>📎</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ fontSize: '11px', color: '#aaa' }}>{file.sender} · {file.time}</p>
                    </div>
                    {file.file_id && (
                      <button onClick={() => {
                        fetch(`${getApiUrl()}/user-files`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: currentUser.id, file_id: file.file_id })
                        }).then(() => alert('내 워크스페이스에 추가됐어요!'))
                      }}
                        style={{ padding: '4px 10px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#534AB7', flexShrink: 0 }}>
                        ➕ 추가
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 인원 목록 패널 */}
        {showMembers && (
          <div style={{ width: '160px', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>
            <p style={{ fontSize: '11px', color: '#aaa', padding: '10px 12px', borderBottom: '1px solid #eee' }}>참여 인원 {room.members.length}명</p>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              {room.members.map((member, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', color: '#3C3489', flexShrink: 0 }}>
                    {member[0]}
                  </div>
                  <span style={{ fontSize: '12px', color: '#555' }}>{member}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { if (window.confirm('협업방에서 나가시겠어요?')) onLeave() }}
              style={{ margin: '8px', padding: '8px', border: '1px solid #f0c0c0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#e53e3e' }}>
              🚪 나가기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomPanel