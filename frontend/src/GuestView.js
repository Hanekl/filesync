import { useState, useRef } from 'react'
import RoomPanel from './RoomPanel'

const mockGuestRooms = [
  { id: 1, name: '외주 프로젝트 협업방', members: ['박부장', '김외주'], lastMessage: '파일 확인해주세요' },
  { id: 2, name: '디자인 검토방', members: ['이수진', '김외주'], lastMessage: '수정본 올렸습니다' },
]

const mockSharedFiles = [
  { id: 1, name: '프로젝트_기획서.pdf', type: 'pdf', sharedBy: '박부장', date: '2024-01-15', size: '2.4MB' },
  { id: 2, name: '디자인_가이드.docx', type: 'doc', sharedBy: '이수진', date: '2024-01-14', size: '1.2MB' },
  { id: 3, name: '회의록_01월.xlsx', type: 'xls', sharedBy: '박부장', date: '2024-01-13', size: '0.8MB' },
]

const typeIcon = { pdf: '📄', doc: '📝', xls: '📊', ppt: '📑' }

function GuestView({ currentUser }) {
  const [openRoom, setOpenRoom] = useState(null)
  const [myFiles, setMyFiles] = useState([])
  const [fileTab, setFileTab] = useState('shared')
  const [roomWidth, setRoomWidth] = useState(320)
  const isResizing = useRef(false)
  const fileInputRef = useRef(null)

  const handleMouseDown = () => { isResizing.current = true }
  const handleMouseMove = (e) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    if (newWidth > 250 && newWidth < 600) setRoomWidth(newWidth)
  }
  const handleMouseUp = () => { isResizing.current = false }

  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files).map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      type: f.name.split('.').pop().toLowerCase(),
      sharedBy: currentUser.name,
      date: new Date().toLocaleDateString('ko-KR'),
      size: (f.size / 1024 / 1024).toFixed(1) + 'MB',
      url: URL.createObjectURL(f)
    }))
    setMyFiles((prev) => [...prev, ...uploaded])
    e.target.value = ''
  }

  const displayFiles = fileTab === 'shared' ? mockSharedFiles : myFiles

  return (
    <div
     style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >

      {/* 상단 */}
      <div style={{ padding: '12px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '500' }}>안녕하세요, {currentUser.name}님 👋</p>
          <p style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>외부 협력사 · 게스트 계정</p>
        </div>
        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', background: '#FAEEDA', color: '#854F0B', fontWeight: '500' }}>GUEST</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 - 협업방 목록 */}
        <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid #eee', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <p style={{ fontSize: '11px', color: '#aaa', padding: '12px 12px 6px', fontWeight: '500' }}>협업방</p>
          {mockGuestRooms.map((room) => (
            <div key={room.id}
              onClick={() => setOpenRoom(openRoom?.id === room.id ? null : room)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer', background: openRoom?.id === room.id ? '#f0effe' : 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = openRoom?.id === room.id ? '#f0effe' : '#f8f8f8'}
              onMouseLeave={(e) => e.currentTarget.style.background = openRoom?.id === room.id ? '#f0effe' : 'transparent'}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏠</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</p>
                <p style={{ fontSize: '10px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 가운데 - 파일 목록 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 파일 탭 */}
          <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
            <button onClick={() => setFileTab('shared')}
              style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: fileTab === 'shared' ? '#534AB7' : '#888', borderBottom: fileTab === 'shared' ? '2px solid #534AB7' : 'none', fontWeight: fileTab === 'shared' ? '500' : '400' }}>
              공유받은 파일
            </button>
            <button onClick={() => setFileTab('mine')}
              style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: fileTab === 'mine' ? '#534AB7' : '#888', borderBottom: fileTab === 'mine' ? '2px solid #534AB7' : 'none', fontWeight: fileTab === 'mine' ? '500' : '400' }}>
              내가 올린 파일 {myFiles.length > 0 && `(${myFiles.length})`}
            </button>
          </div>

          {/* 파일 목록 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr', gap: '10px', padding: '8px 20px', background: '#f8f8f8', borderBottom: '1px solid #eee', flexShrink: 0 }}>
            {['파일명', '공유자', '날짜', '크기'].map((h) => (
              <span key={h} style={{ fontSize: '11px', color: '#aaa', fontWeight: '500' }}>{h}</span>
            ))}
          </div>

          {/* 파일 목록 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {displayFiles.length === 0 ? (
              <div
                onClick={() => fileTab === 'mine' && fileInputRef.current.click()}
                style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px', cursor: fileTab === 'mine' ? 'pointer' : 'default' }}>
                {fileTab === 'mine' ? '📤 클릭해서 파일 업로드' : '공유받은 파일이 없어요'}
              </div>
            ) : (
              displayFiles.map((file) => (
                <div key={file.id}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr', gap: '10px', padding: '12px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', cursor: 'pointer', background: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{typeIcon[file.type] || '📎'}</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#555' }}>{file.sharedBy}</span>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>{file.date}</span>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>{file.size}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽 - 채팅창 */}
        {openRoom && (
          <>
            <div onMouseDown={handleMouseDown} style={{ width: '5px', background: '#eee', cursor: 'col-resize', flexShrink: 0 }} />
            <div style={{ width: `${roomWidth}px`, flexShrink: 0 }}>
              <RoomPanel
                key={openRoom.id}
                room={openRoom}
                currentUser={currentUser}
                onClose={() => setOpenRoom(null)}
                onLeave={() => setOpenRoom(null)}
                isFloating={false}
                onHeaderMouseDown={() => {}}
              />
            </div>
          </>
        )}

      </div>

      {/* 하단 기능 바 */}
      <div style={{ padding: '0 20px', background: 'white', borderTop: '1px solid #eee', display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', height: '44px' }}>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current.click()}
          style={{ padding: '7px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
          📤 파일 업로드
        </button>
      </div>

    </div>
  )
}

export default GuestView