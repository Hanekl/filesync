import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

const API = `${getApiUrl()}` 

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


function ServerStorage({ currentUser }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('전체')
  const [filterDept, setFilterDept] = useState('전체')
  const [sortBy, setSortBy] = useState('date')
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [toast, setToast] = useState(null)
  const [historyFile, setHistoryFile] = useState(null)
  const [versions, setVersions] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const isAdmin = ['admin', 'super_admin'].includes(currentUser?.grade)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFiles() }, [])

  const fetchFiles = async (tag) => {
    setLoading(true)
    try {
      const url = tag && tag !== '전체' ? `${API}/files?tag=${encodeURIComponent(tag)}` : `${API}/files`
      const res = await fetch(url)
      const data = await res.json()
      setFiles(data)
    } catch (e) {
      showToast('파일 목록을 불러오지 못했어요')
    }
    setLoading(false)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleHistory = async (file) => {
    setHistoryFile(file)
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/files/${file.id}/versions`)
      const data = await res.json()
      setVersions(data)
    } catch {
      showToast('버전 히스토리를 불러오지 못했어요')
    }
    setHistoryLoading(false)
  }

  const handleDownload = async (file) => {
    try {
      const res = await fetch(`${API}/files/download/${file.id}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('다운로드에 실패했어요')
    }
  }

  const handleTrash = async (file) => {
    if (!window.confirm(`"${file.original_name}"을 휴지통으로 이동할까요?`)) return
    try {
      const res = await fetch(`${API}/files/${file.id}/trash`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('휴지통으로 이동했어요')
      fetchFiles(filterTag !== '전체' ? filterTag : undefined)
    } catch {
      showToast('삭제에 실패했어요')
    }
  }

  const handleAddToWorkspace = async (file) => {
    try {
      const res = await fetch(`${API}/user-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, file_id: file.id })
      })
      const data = await res.json()
      showToast(data.message)
    } catch {
      showToast('워크스페이스 추가에 실패했어요')
    }
  }

  // 년도/월 목록 계산
  const years = [...new Set(files.map(f => f.created_at?.slice(0, 4)))].filter(Boolean).sort((a, b) => b - a)
  const months = selectedYear
    ? [...new Set(files.filter(f => f.created_at?.startsWith(selectedYear)).map(f => f.created_at?.slice(5, 7)))].filter(Boolean).sort((a, b) => b - a)
    : []

  // 부서 목록
  const depts = ['전체', ...new Set(files.map(f => f.dept).filter(Boolean))]

  // 전체 태그 목록
  const allTags = ['전체', ...new Set(files.flatMap(f => f.tags?.map(t => t.tag) || []))]

  const filteredFiles = files
    .filter(f => !selectedYear || f.created_at?.startsWith(selectedYear))
    .filter(f => !selectedMonth || f.created_at?.slice(5, 7) === selectedMonth)
    .filter(f => filterDept === '전체' || f.dept === filterDept)
    .filter(f => filterTag === '전체' || f.tags?.some(t => t.tag === filterTag))
    .filter(f => f.original_name?.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return (b.created_at || '').localeCompare(a.created_at || '')
      if (sortBy === 'name') return (a.original_name || '').localeCompare(b.original_name || '')
      if (sortBy === 'dept') return (a.dept || '').localeCompare(b.dept || '')
      return 0
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* 히스토리 */}
      {historyFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setHistoryFile(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>🕐 버전 히스토리</span>
              <button onClick={() => setHistoryFile(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#aaa' }}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: '#888' }}>{historyFile.original_name}</p>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {historyLoading ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', padding: '20px' }}>불러오는 중...</p>
              ) : versions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', padding: '20px' }}>버전 히스토리가 없어요</p>
              ) : versions.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#534AB7', minWidth: '30px' }}>v{v.version}</span>
                  {i === 0 && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#EEEDFE', color: '#534AB7' }}>최신</span>
                  )}
                  <div style={{ flex: 1 }}> 
                    <p style={{ fontSize: '12px', color: '#333' }}>{v.uploader}</p>
                    <p style={{ fontSize: '11px', color: '#aaa' }}>{v.created_at}</p>
                  </div>
                  <button onClick={() => handleDownload({ id: historyFile.id, original_name: historyFile.original_name })}
                    style={{ padding: '4px 10px', border: '1px solid #eee', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: 'white', color: '#534AB7' }}>
                    ⬇️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 검색 + 필터 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f8f8', border: '1px solid #eee', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '14px' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="파일명 또는 설명으로 검색..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1 }} />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', fontSize: '14px' }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>필터</span>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={filterTag} onChange={e => { setFilterTag(e.target.value); fetchFiles(e.target.value !== '전체' ? e.target.value : undefined) }}
            style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
            {allTags.map(t => <option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>정렬</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
            <option value="date">날짜순</option>
            <option value="name">이름순</option>
            <option value="dept">부서순</option>
          </select>
          <span style={{ fontSize: '12px', color: '#aaa', marginLeft: 'auto' }}>총 {filteredFiles.length}개</span>
        </div>
      </div>

      {/* 년도 탭 */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 20px', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <button onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
          style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', background: selectedYear === null ? '#534AB7' : '#f0f0f0', color: selectedYear === null ? 'white' : '#555' }}>
          전체
        </button>
        {years.map(year => (
          <button key={year} onClick={() => { setSelectedYear(year); setSelectedMonth(null) }}
            style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', background: selectedYear === year ? '#534AB7' : '#f0f0f0', color: selectedYear === year ? 'white' : '#555' }}>
            {year}년
          </button>
        ))}
      </div>

      {/* 월 탭 */}
      {selectedYear && (
        <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', background: 'white', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <button onClick={() => setSelectedMonth(null)}
            style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: selectedMonth === null ? '#EEEDFE' : 'transparent', color: selectedMonth === null ? '#3C3489' : '#888' }}>
            전체
          </button>
          {months.map(month => (
            <button key={month} onClick={() => setSelectedMonth(month)}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: selectedMonth === month ? '#EEEDFE' : 'transparent', color: selectedMonth === month ? '#3C3489' : '#888' }}>
              {parseInt(month)}월
            </button>
          ))}
        </div>
      )}

      {/* 목록 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.7fr 1.2fr 1fr', gap: '10px', padding: '8px 20px', background: '#f8f8f8', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        {['파일명', '부서', '업로더', '날짜', '태그', ''].map((h, i) => (
          <span key={i} style={{ fontSize: '11px', color: '#aaa', fontWeight: '500' }}>{h}</span>
        ))}
      </div>

      {/* 파일 목록 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>불러오는 중...</div>
        ) : filteredFiles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>파일이 없어요</div>
        ) : (
          filteredFiles.map(file => (
            <div key={file.id}
              style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.7fr 1.2fr 1fr', gap: '10px', padding: '12px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', background: 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              {/* 파일명 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{getTypeIcon(file.original_name)}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#aaa', paddingLeft: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.description}</span>
              </div>

              {/* 부서 */}
              <span style={{ fontSize: '12px', color: '#555' }}>{file.dept}</span>

              {/* 업로더 */}
              <span style={{ fontSize: '12px', color: '#555' }}>{file.uploader}</span>

              {/* 날짜 */}
              <span style={{ fontSize: '11px', color: '#aaa' }}>{file.created_at}</span>

              {/* 태그 */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {file.tags?.filter(t => t.type !== 'date').slice(0, 3).map((t, i) => (
                  <span key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: t.type === 'dept' ? '#E6F1FB' : t.type === 'folder' ? '#EEEDFE' : '#f0f0f0', color: t.type === 'dept' ? '#185FA5' : t.type === 'folder' ? '#534AB7' : '#666' }}>
                    {t.tag}
                  </span>
                ))}
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                <button onClick={() => handleHistory(file)} title="버전 히스토리"
                  style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'white', color: '#555' }}>
                  🕐
                </button>
                <button onClick={() => handleDownload(file)} title="다운로드"
                  style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'white', color: '#555' }}>
                  ⬇️
                </button>
                <button onClick={() => handleAddToWorkspace(file)} title="내 워크스페이스에 추가"
                  style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'white', color: '#555' }}>
                  ➕
                </button>
                {isAdmin && (
                  <button onClick={() => handleTrash(file)} title="휴지통으로 이동"
                    style={{ padding: '4px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'white', color: '#e06060' }}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ServerStorage