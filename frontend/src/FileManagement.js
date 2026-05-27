import { useState, useEffect } from 'react'

const API = `${process.env.REACT_APP_API_URL}` 

const FOLDER_CODES = [
  { code: '01', name: '보고서' },
  { code: '03', name: '계약서/견적/정산' },
  { code: '04', name: '기획서/계획서' },
  { code: '06', name: '발표자료' },
  { code: '07', name: '공고/안내/지침' },
  { code: '08', name: '조사/참고자료' },
  { code: '09', name: '인증서/증명서' },
  { code: '10', name: '동의서' },
  { code: '99', name: '기타' },
]

function getTypeIcon(name) {
  if (!name) return '📎'
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  if (['ppt', 'pptx'].includes(ext)) return '📑'
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return '🖼️'
  if (['hwp', 'hwpx'].includes(ext)) return '📃'
  return '📎'
}

function FileManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('unclassified')
  const [toast, setToast] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)

  // 미분류 파일
  const [unclassified, setUnclassified] = useState([])
  const [unclassifiedLoading, setUnclassifiedLoading] = useState(true)
  const [folderSelects, setFolderSelects] = useState({})

  // 휴지통
  const [trashFiles, setTrashFiles] = useState([])
  const [trashLoading, setTrashLoading] = useState(true)

  // 태그 관리 (클러스터링)
  const [clusters, setClusters] = useState([])
  const [clusterLoading, setClusterLoading] = useState(false)
  const [tagInputs, setTagInputs] = useState({})
  const [runningClustering, setRunningClustering] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const confirm = (msg, onConfirm) => {
    setConfirmModal({ msg, onConfirm })
  }

  const fetchUnclassified = async () => {
    setUnclassifiedLoading(true)
    try {
      const res = await fetch(`${API}/files`)
      const data = await res.json()
      setUnclassified(Array.isArray(data) ? data.filter(f => f.folder_code === '99') : [])
    } catch {
      showToast('미분류 파일을 불러오지 못했어요')
    }
    setUnclassifiedLoading(false)
  }

  const fetchTrash = async () => {
    setTrashLoading(true)
    try {
      const res = await fetch(`${API}/files/trash?grade=${currentUser.grade}`)
      const data = await res.json()
      setTrashFiles(Array.isArray(data) ? data : [])
    } catch {
      showToast('휴지통을 불러오지 못했어요')
    }
    setTrashLoading(false)
  }

  const fetchClusters = async () => {
    setClusterLoading(true)
    try {
      const res = await fetch(`${API}/files/clustering?grade=${currentUser.grade}`)
      const data = await res.json()
      setClusters(data.clusters || [])
      const inputs = {}
      data.clusters?.forEach(c => { inputs[c.cluster_id] = c.tag_name || '' })
      setTagInputs(inputs)
    } catch {
      showToast('태그 데이터를 불러오지 못했어요')
    }
    setClusterLoading(false)
  }

  useEffect(() => {
    fetchUnclassified()
    fetchTrash()
    fetchClusters()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClassify = async (fileId) => {
    const folderCode = folderSelects[fileId]
    if (!folderCode) { showToast('분류할 폴더를 선택해주세요'); return }
    try {
      await fetch(`${API}/files/${fileId}/classify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_code: folderCode })
      })
      showToast('분류 완료!')
      setUnclassified(prev => prev.filter(f => f.id !== fileId))
    } catch {
      showToast('분류에 실패했어요')
    }
  }

  const handleRestore = async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}/restore`, { method: 'POST' })
      showToast('복원 완료!')
      setTrashFiles(prev => prev.filter(f => f.id !== fileId))
    } catch {
      showToast('복원에 실패했어요')
    }
  }

  const handlePermanentDelete = (fileId, fileName) => {
    confirm(`"${fileName}"을 영구 삭제할까요?\n복원이 불가능해요.`, async () => {
      try {
        await fetch(`${API}/files/${fileId}/permanent?grade=${currentUser.grade}`, { method: 'DELETE' })
        showToast('영구 삭제 완료')
        setTrashFiles(prev => prev.filter(f => f.id !== fileId))
      } catch {
        showToast('삭제에 실패했어요')
      }
    })
  }

  const handleRunClustering = async () => {
    setRunningClustering(true)
    try {
      const res = await fetch(`${API}/files/clustering?grade=${currentUser.grade}`, { method: 'POST' })
      const data = await res.json()
      if (data.detail) { showToast(data.detail); setRunningClustering(false); return }
      setClusters(data.clusters || [])
      const inputs = {}
      data.clusters?.forEach(c => { inputs[c.cluster_id] = c.tag_name || '' })
      setTagInputs(inputs)
      showToast('클러스터링 완료!')
    } catch {
      showToast('클러스터링에 실패했어요')
    }
    setRunningClustering(false)
  }

  const handleSaveTagName = async (clusterId) => {
    const tagName = tagInputs[clusterId]?.trim()
    if (!tagName) { showToast('태그 이름을 입력해주세요'); return }
    try {
      await fetch(`${API}/files/clustering/tag-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: clusterId, tag_name: tagName, grade: currentUser.grade })
      })
      setClusters(prev => prev.map(c => c.cluster_id === clusterId ? { ...c, tag_name: tagName } : c))
      showToast(`"${tagName}" 태그 저장 완료!`)
    } catch {
      showToast('저장에 실패했어요')
    }
  }

  const tabs = [
    { key: 'unclassified', label: '📂 미분류 파일', count: unclassified.length },
    { key: 'trash', label: '🗑️ 휴지통', count: trashFiles.length },
    { key: 'tags', label: '🏷️ 태그 관리' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000 }}>
          ✅ {toast}
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>확인</p>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{confirmModal.msg}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '9px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                취소
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', background: '#e53e3e', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>📁 파일 관리</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽 탭 */}
        <div style={{ width: '180px', borderRight: '1px solid #eee', background: 'white', flexShrink: 0, padding: '12px 0' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ width: '100%', padding: '10px 16px', border: 'none', background: activeTab === tab.key ? '#EEEDFE' : 'transparent', color: activeTab === tab.key ? '#3C3489' : '#555', fontSize: '13px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: activeTab === tab.key ? '500' : '400' }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: activeTab === tab.key ? '#534AB7' : '#eee', color: activeTab === tab.key ? 'white' : '#888', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: '#f8f8f8' }}>

          {/* 미분류 파일 */}
          {activeTab === 'unclassified' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: '#888' }}>AI가 분류하지 못한 파일들이에요. 직접 분류 폴더를 지정해주세요.</p>
                <button onClick={fetchUnclassified}
                  style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
                  새로고침
                </button>
              </div>
              {unclassifiedLoading ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', marginTop: '40px' }}>불러오는 중...</p>
              ) : unclassified.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <p style={{ fontSize: '32px', marginBottom: '10px' }}>🎉</p>
                  <p style={{ color: '#aaa', fontSize: '13px' }}>미분류 파일이 없어요!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unclassified.map(file => (
                    <div key={file.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{getTypeIcon(file.original_name)}</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</p>
                        <p style={{ fontSize: '11px', color: '#aaa' }}>{file.uploader} · {file.dept} · {file.created_at}</p>
                      </div>
                      <select
                        value={folderSelects[file.id] || ''}
                        onChange={e => setFolderSelects(prev => ({ ...prev, [file.id]: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
                        <option value=''>폴더 선택</option>
                        {FOLDER_CODES.filter(f => f.code !== '99').map(f => (
                          <option key={f.code} value={f.code}>{f.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleClassify(file.id)}
                        style={{ padding: '6px 14px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>
                        분류
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 휴지통 */}
          {activeTab === 'trash' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: '#888' }}>서버 저장소에서 휴지통으로 이동된 파일들이에요. 영구 삭제하면 복원이 불가능해요.</p>
                <button onClick={fetchTrash}
                  style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
                  새로고침
                </button>
              </div>
              {trashLoading ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', marginTop: '40px' }}>불러오는 중...</p>
              ) : trashFiles.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <p style={{ fontSize: '32px', marginBottom: '10px' }}>🗑️</p>
                  <p style={{ color: '#aaa', fontSize: '13px' }}>휴지통이 비어있어요</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trashFiles.map(file => (
                    <div key={file.id} style={{ background: 'white', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{getTypeIcon(file.original_name)}</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</p>
                        <p style={{ fontSize: '11px', color: '#aaa' }}>{file.uploader} · {file.dept} · {file.created_at}</p>
                      </div>
                      <button onClick={() => handleRestore(file.id)}
                        style={{ padding: '6px 12px', border: '1px solid #534AB7', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#534AB7', flexShrink: 0 }}>
                        복원
                      </button>
                      <button onClick={() => handlePermanentDelete(file.id, file.original_name)}
                        style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#e53e3e', cursor: 'pointer', fontSize: '12px', color: 'white', flexShrink: 0 }}>
                        영구 삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 태그 관리 */}
          {activeTab === 'tags' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: '#888' }}>AI가 파일 내용을 기반으로 생성한 태그들이에요. 이름을 수정하거나 클러스터링을 재실행할 수 있어요.</p>
                <button onClick={handleRunClustering} disabled={runningClustering}
                  style={{ padding: '6px 14px', background: runningClustering ? '#ccc' : '#534AB7', color: 'white', border: 'none', borderRadius: '6px', cursor: runningClustering ? 'default' : 'pointer', fontSize: '12px', flexShrink: 0 }}>
                  {runningClustering ? '실행 중...' : '🔄 클러스터링 재실행'}
                </button>
              </div>
              {clusterLoading ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', marginTop: '40px' }}>불러오는 중...</p>
              ) : clusters.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <p style={{ fontSize: '32px', marginBottom: '10px' }}>🏷️</p>
                  <p style={{ color: '#aaa', fontSize: '13px' }}>태그 데이터가 없어요. 클러스터링을 실행해주세요.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clusters.map(c => (
                    <div key={c.cluster_id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>군집 {c.cluster_id}</span>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>· {c.file_count}개 파일</span>
                        {c.tag_name && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#EEEDFE', color: '#534AB7', fontWeight: '500' }}>
                            {c.tag_name}
                          </span>
                        )}
                      </div>
                      {/* 키워드 */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {c.keywords.map((kw, i) => (
                          <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#f0f0f0', color: '#555' }}>{kw}</span>
                        ))}
                      </div>
                      {/* 대표 파일 */}
                      <p style={{ fontSize: '11px', color: '#aaa' }}>
                        {c.files.join(', ')}{c.file_count > 5 ? ` 외 ${c.file_count - 5}개` : ''}
                      </p>
                      {/* 태그 이름 입력 */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          value={tagInputs[c.cluster_id] || ''}
                          onChange={e => setTagInputs(prev => ({ ...prev, [c.cluster_id]: e.target.value }))}
                          placeholder="태그 이름 입력..."
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                        />
                        <button onClick={() => handleSaveTagName(c.cluster_id)}
                          style={{ padding: '7px 16px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          저장
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileManagement