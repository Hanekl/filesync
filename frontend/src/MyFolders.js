import { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from './config'

const API = `${getApiUrl()}` 
const typeIcon = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📑', pptx: '📑', default: '📎' }

function getIcon(name) {
  const ext = name?.split('.').pop().toLowerCase()
  return typeIcon[ext] || typeIcon.default
}

// 평탄한 폴더 배열 → 트리 구조로 재구성
function buildTree(flatFolders) {
  const map = {}
  flatFolders.forEach(f => { map[f.id] = { ...f, files: [], children: [] } })
  const roots = []
  flatFolders.forEach(f => {
    if (f.parent_id && map[f.parent_id]) map[f.parent_id].children.push(map[f.id])
    else roots.push(map[f.id])
  })
  return roots
}

function MyFolders({ currentUser, onFilesChange }) {
  const [folders, setFolders] = useState([])
  const [homeFiles, setHomeFiles] = useState([])
  const [unsortedFiles, setUnsortedFiles] = useState([])
  const [currentPath, setCurrentPath] = useState([])
  const [pathHistory, setPathHistory] = useState([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [dragFile, setDragFile] = useState(null)
  const [dragOverFolderId, setDragOverFolderId] = useState(null)
  const [kebabMenu, setKebabMenu] = useState(null)
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [editingMemo, setEditingMemo] = useState(null)
  const [memoValue, setMemoValue] = useState('')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('가나다')
  const [mergeModal, setMergeModal] = useState(null)
  const [draggingFolder, setDraggingFolder] = useState(null)
  const [trashFiles, setTrashFiles] = useState([])
  const [showTrash, setShowTrash] = useState(false)
  const [dragOverTrash, setDragOverTrash] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)

  const userId = currentUser?.id

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // ── 데이터 로드 ─────────────────────────────────
  const loadData = useCallback(async () => {
    if (!userId) return
    try {
      const [foldersRes, userFilesRes] = await Promise.all([
        fetch(`${API}/folders/${userId}`),
        fetch(`${API}/user-files/${userId}`)
      ])
      const flatFolders = await foldersRes.json()
      const userFiles = await userFilesRes.json()

      // 트리 재구성
      const tree = buildTree(flatFolders)

      // 파일을 각 폴더에 배치
      const fileMap = {}
      userFiles.forEach(f => {
        if (f.folder_id) {
          if (!fileMap[f.folder_id]) fileMap[f.folder_id] = []
          fileMap[f.folder_id].push(f)
        }
      })
      const assignFiles = (nodes) => nodes.map(n => ({
        ...n,
        files: fileMap[n.id] || [],
        children: assignFiles(n.children)
      }))
      setFolders(assignFiles(tree))

      // 미분류 파일 (folder_id = null)
      setHomeFiles(userFiles.filter(f => f.is_home && !f.folder_id))
      setUnsortedFiles(userFiles.filter(f => !f.folder_id && !f.is_home))
    } catch {
      showToast('데이터를 불러오지 못했어요')
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  // ── 네비게이션 ──────────────────────────────────
  const navigateTo = (newPath) => {
    const isSame = JSON.stringify(pathHistory[historyIndex]) === JSON.stringify(newPath)
    if (!isSame) {
      const newHistory = [...pathHistory.slice(0, historyIndex + 1), newPath]
      setPathHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
    setCurrentPath(newPath)
  }
  const goBack = () => { if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); setCurrentPath(pathHistory[i]) } }
  const goForward = () => { if (historyIndex < pathHistory.length - 1) { const i = historyIndex + 1; setHistoryIndex(i); setCurrentPath(pathHistory[i]) } }

  // ── 현재 위치 데이터 ──────────────────────────────
  const getCurrentFolders = () => {
    if (currentPath.length === 0) return folders
    let current = folders
    for (const id of currentPath) {
      const f = current.find(f => f.id === id)
      if (!f) return []
      current = f.children
    }
    return current
  }

  const getCurrentFiles = () => {
    if (currentPath.length === 0) return homeFiles
    let current = folders
    let folder = null
    for (const id of currentPath) {
      folder = current.find(f => f.id === id)
      if (!folder) return []
      current = folder.children
    }
    return folder?.files || []
  }

  const getFolderName = (id) => {
    const find = (arr) => {
      for (const f of arr) {
        if (f.id === id) return f.name
        const found = find(f.children)
        if (found) return found
      }
      return null
    }
    return find(folders)
  }

  const getCurrentParentId = () => currentPath.length > 0 ? currentPath[currentPath.length - 1] : null

  // ── 폴더 CRUD ────────────────────────────────────
  const checkDuplicate = (name, excludeId = null) =>
    getCurrentFolders().find(f => f.name === name && f.id !== excludeId)

  const handleCreateFolder = async () => {
    let name = '새 폴더'; let count = 2
    while (checkDuplicate(name)) { name = `새 폴더 (${count})`; count++ }
    try {
      const res = await fetch(`${API}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name, parent_id: getCurrentParentId() })
      })
      const newFolder = await res.json()
      const node = { ...newFolder, files: [], children: [] }
      if (currentPath.length === 0) {
        setFolders(prev => [...prev, node])
      } else {
        updateFolderTree(prev => prev.map(f => f.id === getCurrentParentId() ? { ...f, children: [...f.children, node] } : f))
      }
      setTimeout(() => { setRenamingFolder(node); setRenameValue(name) }, 50)
    } catch { showToast('폴더 생성에 실패했어요') }
  }

  const handleRename = async (folder) => {
    if (!renameValue.trim()) { setRenamingFolder(null); return }
    const duplicate = checkDuplicate(renameValue, folder.id)
    if (duplicate) { setMergeModal({ existing: duplicate, incoming: folder }); setRenamingFolder(null); return }
    try {
      await fetch(`${API}/folders/${folder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue })
      })
      updateFolderInTree(folder.id, { name: renameValue })
    } catch { showToast('이름 변경에 실패했어요') }
    setRenamingFolder(null)
  }

  const handleDelete = async (folder) => {
    try {
      await fetch(`${API}/folders/${folder.id}`, { method: 'DELETE' })
      await loadData()
    } catch { showToast('삭제에 실패했어요') }
    setKebabMenu(null)
  }

  const handleSaveMemo = async (folder) => {
    try {
      await fetch(`${API}/folders/${folder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoValue })
      })
      updateFolderInTree(folder.id, { memo: memoValue })
    } catch { showToast('메모 저장에 실패했어요') }
    setEditingMemo(null)
  }

  // ── 트리 업데이트 헬퍼 ────────────────────────────
  const updateFolderTree = (updater) => setFolders(prev => updater(prev))

  const updateFolderInTree = (id, changes) => {
    const update = (arr) => arr.map(f => f.id === id ? { ...f, ...changes } : { ...f, children: update(f.children) })
    setFolders(prev => update(prev))
  }


  // ── 드래그 앤 드랍 (파일) ─────────────────────────
  const handleDropToFolder = async (folderId) => {
    if (!dragFile) return
    try {
      await fetch(`${API}/user-files/${dragFile.user_file_id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId })
      })
      await loadData()
    } catch { showToast('이동에 실패했어요') }
    setDragFile(null); setDragOverFolderId(null)
  }

  const handleDropToCurrentLocation = async () => {
      if (!dragFile) { setDragFile(null); return }
      try {
        const isHome = currentPath.length === 0
        await fetch(`${API}/user-files/${dragFile.user_file_id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_id: null, is_home: isHome })
        })
        await loadData()
      } catch { showToast('이동에 실패했어요') }
      setDragFile(null)
  }

  const handleDropToPath = async (targetFolderId) => {
    if (!dragFile) return
    try {
      await fetch(`${API}/user-files/${dragFile.user_file_id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId })
      })
      await loadData()
    } catch { showToast('이동에 실패했어요') }
    setDragFile(null)
  }

  const handleDropToTrash = async () => {
    if (!dragFile) return
    setTrashFiles(prev => [...prev, { ...dragFile, trashedAt: new Date().toLocaleDateString('ko-KR') }])
    try {
      await fetch(`${API}/user-files/${dragFile.user_file_id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: null, is_deleted: true })
      })
      await loadData()
    } catch { showToast('삭제에 실패했어요') }
    setDragFile(null); setDragOverTrash(false)
  }

  // ── 폴더 드래그 ──────────────────────────────────
  const handleDropFolderToFolder = async (targetFolderId) => {
    if (!draggingFolder || draggingFolder.id === targetFolderId) return
    try {
      await fetch(`${API}/folders/${draggingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: targetFolderId })
      })
      await loadData()
    } catch { showToast('이동에 실패했어요') }
    setDraggingFolder(null); setDragOverFolderId(null)
  }

  const handleDropFolderToPath = async (targetFolderId) => {
    if (!draggingFolder) return
    try {
      await fetch(`${API}/folders/${draggingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: targetFolderId })
      })
      await loadData()
    } catch { showToast('이동에 실패했어요') }
    setDraggingFolder(null)
  }

  const handleFileOut = async (file) => {
    try {
      await fetch(`${API}/user-files/${file.user_file_id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: null })
      })
      await loadData()
    } catch { showToast('꺼내기에 실패했어요') }
  }

  const handleRestore = async (file) => {
    try {
      await fetch(`${API}/user-files/${file.user_file_id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: null, is_deleted: false })
      })
      setTrashFiles(prev => prev.filter(f => f.user_file_id !== file.user_file_id))
      await loadData()
    } catch { showToast('복원에 실패했어요') }
  }

  const handleEmptyTrash = () => {
    if (trashFiles.length === 0) return
    setConfirmModal({
      message: `휴지통을 비울까요? 파일 ${trashFiles.length}개가 워크스페이스에서 제거돼요.`,
      onConfirm: () => { setTrashFiles([]); setConfirmModal(null) }
    })
  }

  // ── 파일 업로드 ──────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim() || !uploadDesc.trim()) { showToast('파일명과 설명을 입력해주세요'); return }
    setUploading(true)
    const form = new FormData()
    form.append('file', uploadFile)
    form.append('uploader_id', String(userId))
    form.append('description', uploadDesc)
    form.append('custom_name', uploadName || uploadFile.name)
    try {
      const res = await fetch(`${API}/files/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.duplicate) {
        showToast('이미 서버에 있는 파일이에요. 워크스페이스에 바로가기를 추가할게요')
        await fetch(`${API}/user-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, file_id: data.file_id })
        })
      } else {
        showToast('업로드 완료!')
      }
      setUploadModal(false); setUploadFile(null); setUploadName(''); setUploadDesc('')
      await loadData()
    } catch { showToast('업로드에 실패했어요') }
    setUploading(false)
  }

  // ── 정렬 ─────────────────────────────────────────
  const sortFolders = (arr) => {
    const copy = [...arr]
    if (sortOrder === '가나다') return copy.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    if (sortOrder === '가나다 역순') return copy.sort((a, b) => b.name.localeCompare(a.name, 'ko'))
    if (sortOrder === '최신순') return copy.sort((a, b) => b.id - a.id)
    if (sortOrder === '오래된순') return copy.sort((a, b) => a.id - b.id)
    return copy
  }

  const currentFolders = sortFolders(getCurrentFolders())
  const currentFiles = getCurrentFiles()
  const filteredFolders = search ? currentFolders.filter(f => f.name.toLowerCase().includes(search.toLowerCase())) : currentFolders
  const filteredFiles = search ? currentFiles.filter(f => f.display_name?.toLowerCase().includes(search.toLowerCase())) : currentFiles
  const filteredUnsorted = search ? unsortedFiles.filter(f => f.display_name?.toLowerCase().includes(search.toLowerCase())) : unsortedFiles

  return (
    <div style={{ display: 'flex', height: '100%' }} onClick={() => setKebabMenu(null)}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* 왼쪽 패널 */}
      <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #eee', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
          <p style={{ fontSize: '12px', fontWeight: '500', color: '#555' }}>📎 정리 안된 파일</p>
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>드래그해서 폴더/경로로 이동</p>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredUnsorted.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', padding: '20px' }}>
              {search ? '검색 결과 없음' : '미분류 파일 없음 ✅'}
            </p>
          ) : filteredUnsorted.map((file) => (
            <div key={file.user_file_id} draggable
              onDragStart={() => { setDragFile({ ...file, fromCurrent: false }); window.__draggedWorkspaceFile = file; }}
              onDragEnd={() => { setDragFile(null); window.__draggedWorkspaceFile = null }}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #eee', background: 'white', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{getIcon(file.display_name)}</span>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.display_name}</p>
                <p style={{ fontSize: '10px', color: '#aaa' }}>{file.created_at}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 업로드 버튼 */}
        <div style={{ padding: '10px', borderTop: '1px solid #eee' }}>
          <button onClick={() => setUploadModal(true)}
            style={{ width: '100%', padding: '8px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
            ⬆️ 파일 업로드
          </button>
        </div>

        {/* 휴지통 */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOverTrash(true) }}
          onDragLeave={() => setDragOverTrash(false)}
          onDrop={handleDropToTrash}
          onClick={() => setShowTrash(v => !v)}
          style={{ padding: '12px', borderTop: '1px solid #eee', cursor: 'pointer', background: dragOverTrash ? '#fff0f0' : showTrash ? '#fef2f2' : 'white', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
          <span style={{ fontSize: '16px' }}>🗑️</span>
          <span style={{ fontSize: '12px', color: '#e53e3e', fontWeight: '500' }}>휴지통 ({trashFiles.length})</span>
        </div>
      </div>

      {/* 오른쪽 메인 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 네비게이션 */}
        <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goBack} disabled={historyIndex === 0}
            style={{ padding: '4px 10px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', color: historyIndex === 0 ? '#ccc' : '#555' }}>←</button>
          <button onClick={goForward} disabled={historyIndex === pathHistory.length - 1}
            style={{ padding: '4px 10px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: historyIndex === pathHistory.length - 1 ? 'not-allowed' : 'pointer', fontSize: '14px', color: historyIndex === pathHistory.length - 1 ? '#ccc' : '#555' }}>→</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflow: 'hidden' }}>
            <span onClick={() => navigateTo([])}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.stopPropagation(); if (dragFile) handleDropToPath(null); else if (draggingFolder) handleDropFolderToPath(null) }}
              style={{ fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', color: currentPath.length === 0 ? '#333' : '#534AB7', fontWeight: currentPath.length === 0 ? '500' : '400', padding: (dragFile || draggingFolder) ? '2px 8px' : '0', background: (dragFile || draggingFolder) ? '#f0effe' : 'transparent', borderRadius: '6px', border: (dragFile || draggingFolder) ? '1px dashed #534AB7' : 'none' }}>
              🏠 홈
            </span>
            {currentPath.map((id, i) => (
              <span key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#aaa' }}>›</span>
                <span
                  onDrop={e => { e.stopPropagation(); if (dragFile) handleDropToPath(currentPath[i]); else if (draggingFolder) handleDropFolderToPath(currentPath[i]) }}
                  onDragOver={e => e.preventDefault()}
                  style={{ fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', color: i === currentPath.length - 1 ? '#333' : '#534AB7', fontWeight: i === currentPath.length - 1 ? '500' : '400', padding: (dragFile || draggingFolder) ? '2px 8px' : '0', background: (dragFile || draggingFolder) ? '#f0effe' : 'transparent', borderRadius: '6px', border: (dragFile || draggingFolder) ? '1px dashed #534AB7' : 'none' }}>
                  {getFolderName(id)}
                </span>
              </span>
            ))}
          </div>

          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', outline: 'none', flexShrink: 0 }}>
            <option value="가나다">가나다순</option>
            <option value="가나다 역순">가나다 역순</option>
            <option value="최신순">최신순</option>
            <option value="오래된순">오래된순</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일/폴더 검색..."
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', outline: 'none', width: '130px', flexShrink: 0 }} />
          <button onClick={handleCreateFolder}
            style={{ padding: '6px 12px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>
            + 새 폴더
          </button>
        </div>

        {/* 콘텐츠 */}
        {showTrash ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#f8f8f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#555' }}>🗑️ 휴지통 ({trashFiles.length}개)</p>
              <button onClick={handleEmptyTrash} disabled={trashFiles.length === 0}
                style={{ padding: '6px 14px', background: trashFiles.length === 0 ? '#f0f0f0' : '#e53e3e', color: trashFiles.length === 0 ? '#bbb' : 'white', border: 'none', borderRadius: '8px', cursor: trashFiles.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                휴지통 비우기
              </button>
            </div>
            {trashFiles.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '60px', fontSize: '13px' }}>휴지통이 비어있어요 🎉</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                {trashFiles.map((file, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px', position: 'relative', opacity: 0.7 }}>
                    <p style={{ fontSize: '22px', marginBottom: '8px' }}>{getIcon(file.display_name)}</p>
                    <p style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.display_name}</p>
                    <p style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{file.trashedAt} 삭제</p>
                    <button onClick={() => handleRestore(file)} title="복원"
                      style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#bbb' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#534AB7'}
                      onMouseLeave={e => e.currentTarget.style.color = '#bbb'}>↩</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#f8f8f8' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { if (dragFile) handleDropToCurrentLocation() }}>

            {dragFile && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0effe', border: '1px solid #c4bff5', borderRadius: '10px', fontSize: '12px', color: '#534AB7' }}>
                💡 상단 경로에 드랍하거나 폴더 위에 드랍하세요. 왼쪽 휴지통에 드랍하면 삭제돼요.
              </div>
            )}

            {/* 폴더 그리드 */}
            {filteredFolders.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {filteredFiles.length > 0 && <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px', fontWeight: '500' }}>폴더</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {filteredFolders.map((folder) => (
                    <div key={folder.id} draggable
                      onDragStart={e => { e.stopPropagation(); setDraggingFolder(folder); setDragFile(null) }}
                      onDragEnd={() => { setDraggingFolder(null); setDragOverFolderId(null) }}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverFolderId(folder.id) }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={e => { e.stopPropagation(); if (dragFile) handleDropToFolder(folder.id); else if (draggingFolder) handleDropFolderToFolder(folder.id) }}
                      onDoubleClick={() => navigateTo([...currentPath, folder.id])}
                      style={{ background: dragOverFolderId === folder.id ? '#f0effe' : 'white', border: `2px ${dragOverFolderId === folder.id ? 'dashed #534AB7' : 'solid #eee'}`, borderRadius: '10px', padding: '14px', position: 'relative', cursor: 'pointer' }}
                      onMouseEnter={e => { if (dragOverFolderId !== folder.id) e.currentTarget.style.background = '#f8f8f8' }}
                      onMouseLeave={e => { if (dragOverFolderId !== folder.id) e.currentTarget.style.background = 'white' }}>

                      <button onClick={e => { e.stopPropagation(); setKebabMenu(kebabMenu?.id === folder.id ? null : { id: folder.id, folder }) }}
                        style={{ position: 'absolute', top: '6px', right: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#bbb', padding: '2px 6px', borderRadius: '4px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eee'; e.currentTarget.style.color = '#555' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#bbb' }}>⋮</button>

                      {kebabMenu?.id === folder.id && (
                        <div style={{ position: 'absolute', top: '32px', right: '6px', background: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '130px' }}
                          onClick={e => e.stopPropagation()}>
                          <div onClick={() => { setRenamingFolder(folder); setRenameValue(folder.name); setKebabMenu(null) }}
                            style={{ padding: '9px 14px', fontSize: '12px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>✏️ 이름 변경</div>
                          <div onClick={() => { setEditingMemo(folder); setMemoValue(folder.memo); setKebabMenu(null) }}
                            style={{ padding: '9px 14px', fontSize: '12px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>📝 메모 편집</div>
                          <div onClick={() => handleDelete(folder)}
                            style={{ padding: '9px 14px', fontSize: '12px', cursor: 'pointer', color: '#e53e3e' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>🗑️ 삭제</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingRight: '20px' }}>
                        <span style={{ fontSize: '22px', flexShrink: 0 }}>📁</span>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          {renamingFolder?.id === folder.id ? (
                            <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRename(folder); if (e.key === 'Escape') setRenamingFolder(null) }}
                              onBlur={() => handleRename(folder)} autoFocus onClick={e => e.stopPropagation()}
                              style={{ width: '100%', padding: '2px 6px', border: '1px solid #534AB7', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                          ) : (
                            <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</p>
                          )}
                        </div>
                      </div>

                      {editingMemo?.id === folder.id ? (
                        <input value={memoValue} onChange={e => setMemoValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveMemo(folder); if (e.key === 'Escape') setEditingMemo(null) }}
                          onBlur={() => handleSaveMemo(folder)}
                          autoFocus onClick={e => e.stopPropagation()} placeholder="한줄 메모..."
                          style={{ width: '100%', padding: '3px 6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px' }} />
                      ) : (
                        <p onClick={e => { e.stopPropagation(); setEditingMemo(folder); setMemoValue(folder.memo) }}
                          style={{ fontSize: '11px', color: folder.memo ? '#888' : '#ccc', marginBottom: '6px', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folder.memo || '메모 추가...'}
                        </p>
                      )}
                      <p style={{ fontSize: '10px', color: '#aaa' }}>파일 {folder.files.length}개 · 폴더 {folder.children.length}개</p>
                      <p style={{ fontSize: '10px', color: '#ccc', marginTop: '6px', textAlign: 'center' }}>더블클릭으로 열기</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 현재 위치 파일 */}
            {filteredFiles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px', fontWeight: '500' }}>파일</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {filteredFiles.map((file) => (
                    <div key={file.user_file_id} draggable
                      onDragStart={() => { setDragFile({ ...file, fromCurrent: true }); window.__draggedWorkspaceFile = file; }}
                      onDragEnd={() => { setDragFile(null) }}
                      style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px', cursor: 'grab', position: 'relative' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <p style={{ fontSize: '22px', marginBottom: '8px' }}>{getIcon(file.display_name)}</p>
                      <p style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.display_name}</p>
                      <p style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{file.created_at}</p>
                      {currentPath.length > 0 && (
                        <button onClick={() => handleFileOut(file)} title="꺼내기"
                          style={{ position: 'absolute', top: '6px', right: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#bbb' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#534AB7'}
                          onMouseLeave={e => e.currentTarget.style.color = '#bbb'}>↩</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredFolders.length === 0 && filteredFiles.length === 0 && !dragFile && (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '60px', fontSize: '13px' }}>
                {search ? '검색 결과가 없어요' : '빈 폴더예요. 새 폴더를 만들어보세요!'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      {uploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setUploadModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '15px', fontWeight: '500' }}>⬆️ 파일 업로드</p>
            <input type="file" onChange={e => { setUploadFile(e.target.files[0]); setUploadName(e.target.files[0]?.name || '') }}
              style={{ fontSize: '13px' }} />
            <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="파일명 (필수)"
              style={{ padding: '8px 12px', border: `1px solid ${uploadName ? '#ddd' : '#828282'}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
            <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="설명 (필수)"
              style={{ padding: '8px 12px', border: `1px solid ${uploadDesc ? '#ddd' : '#828282'}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setUploadModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                취소
              </button>
              <button onClick={handleUpload} disabled={uploading}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: uploading ? '#aaa' : '#534AB7', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 합치기 모달 */}
      {mergeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '15px', fontWeight: '500' }}>⚠️ 이름이 중복돼요</p>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
              <strong>"{mergeModal.existing.name}"</strong> 폴더가 이미 있어요.<br />두 폴더를 합칠까요?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setMergeModal(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>취소</button>
              <button onClick={async () => {
                // 합치기: incoming 폴더의 파일들을 existing으로 이동 후 삭제
                try {
                  await fetch(`${API}/folders/${mergeModal.incoming.id}`, { method: 'DELETE' })
                  await loadData()
                } catch { showToast('합치기에 실패했어요') }
                setMergeModal(null)
              }}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>합치기</button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>취소</button>
              <button onClick={confirmModal.onConfirm}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#e53e3e', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>비우기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyFolders