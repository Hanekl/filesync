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

  const isAdmin = currentUser?.grade === 'super_admin' || currentUser?.permissions?.includes('file_manage')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFiles() }, [])

  const fetchFiles = async (tag) => {
    setLoading(true)
    try {
      const url = tag && tag !== '전체' ? `${API}/files?tag=${encodeURIComponent(tag)}` : `${API}/files`
      const res = await fetch(url)
      const data = await res.json()
      setFiles(data)
    } catch { showToast('파일 목록을 불러오지 못했어요') }
    setLoading(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleHistory = async (file) => {
    setHistoryFile(file); setHistoryLoading(true)
    try { const res = await fetch(`${API}/files/${file.id}/versions`); setVersions(await res.json()) }
    catch { showToast('버전 히스토리를 불러오지 못했어요') }
    setHistoryLoading(false)
  }

  const handleDownload = async (file) => {
    try {
      const res = await fetch(`${API}/files/download/${file.id}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = file.original_name; a.click()
      URL.revokeObjectURL(url)
    } catch { showToast('다운로드에 실패했어요') }
  }

  const handleTrash = async (file) => {
    if (!window.confirm(`"${file.original_name}"을 휴지통으로 이동할까요?`)) return
    try {
      const res = await fetch(`${API}/files/${file.id}/trash`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('휴지통으로 이동했어요')
      fetchFiles(filterTag !== '전체' ? filterTag : undefined)
    } catch { showToast('삭제에 실패했어요') }
  }

  const handleAddToWorkspace = async (file) => {
    try {
      const res = await fetch(`${API}/user-files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, file_id: file.id }) })
      const data = await res.json(); showToast(data.message)
    } catch { showToast('워크스페이스 추가에 실패했어요') }
  }

  const years = [...new Set(files.map(f => f.created_at?.slice(0, 4)))].filter(Boolean).sort((a, b) => b - a)
  const months = selectedYear ? [...new Set(files.filter(f => f.created_at?.startsWith(selectedYear)).map(f => f.created_at?.slice(5, 7)))].filter(Boolean).sort((a, b) => b - a) : []
  const depts = ['전체', ...new Set(files.map(f => f.dept).filter(Boolean))]
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

  const selectStyle = { padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', outline: 'none', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '10px 20px', borderRadius: '8px', fontSize: 'var(--font-size)', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* 히스토리 모달 */}
      {historyFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setHistoryFile(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '24px', width: '400px', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>🕐 버전 히스토리</span>
              <button onClick={() => setHistoryFile(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{historyFile.original_name}</p>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {historyLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)', padding: '20px' }}>불러오는 중...</p>
              ) : versions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>📋</span>
                  <p>버전 히스토리가 없어요</p>
                </div>
              ) : versions.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--accent)', minWidth: '30px' }}>v{v.version}</span>
                  {i === 0 && <span style={{ fontSize: 'var(--font-size-sm)', padding: '2px 6px', borderRadius: '10px', background: 'var(--accent-light)', color: 'var(--accent)' }}>최신</span>}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)' }}>{v.uploader}</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{v.created_at}</p>
                  </div>
                  <button onClick={() => handleDownload({ id: historyFile.id, original_name: historyFile.original_name })}
                    style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--accent)' }}>
                    ⬇️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 검색 + 필터 */}
      <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '14px' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="파일명 또는 설명으로 검색..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 'var(--font-size)', flex: 1, color: 'var(--text)' }} />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>필터</span>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={filterTag} onChange={e => { setFilterTag(e.target.value); fetchFiles(e.target.value !== '전체' ? e.target.value : undefined) }} style={selectStyle}>
            {allTags.map(t => <option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', marginLeft: '8px' }}>정렬</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
            <option value="date">날짜순</option>
            <option value="name">이름순</option>
            <option value="dept">부서순</option>
          </select>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginLeft: 'auto' }}>총 {filteredFiles.length}개</span>
        </div>
      </div>

      {/* 년도 탭 */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
          style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', fontSize: 'var(--font-size)', cursor: 'pointer', background: selectedYear === null ? 'var(--accent)' : 'var(--surface-alt)', color: selectedYear === null ? 'var(--accent-text)' : 'var(--text-sub)' }}>
          전체
        </button>
        {years.map(year => (
          <button key={year} onClick={() => { setSelectedYear(year); setSelectedMonth(null) }}
            style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', fontSize: 'var(--font-size)', cursor: 'pointer', background: selectedYear === year ? 'var(--accent)' : 'var(--surface-alt)', color: selectedYear === year ? 'var(--accent-text)' : 'var(--text-sub)' }}>
            {year}년
          </button>
        ))}
      </div>

      {/* 월 탭 */}
      {selectedYear && (
        <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setSelectedMonth(null)}
            style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: selectedMonth === null ? 'var(--accent-light)' : 'transparent', color: selectedMonth === null ? 'var(--accent)' : 'var(--text-sub)' }}>
            전체
          </button>
          {months.map(month => (
            <button key={month} onClick={() => setSelectedMonth(month)}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: selectedMonth === month ? 'var(--accent-light)' : 'transparent', color: selectedMonth === month ? 'var(--accent)' : 'var(--text-sub)' }}>
              {parseInt(month)}월
            </button>
          ))}
        </div>
      )}

      {/* 목록 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.7fr 1.2fr 1fr', gap: '10px', padding: '8px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {['파일명', '부서', '업로더', '날짜', '태그', ''].map((h, i) => (
          <span key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '500' }}>{h}</span>
        ))}
      </div>

      {/* 파일 목록 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '28px' }}>📂</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>파일 목록을 불러오는 중이에요...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '28px' }}>🗂️</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size)' }}>
              {search ? `"${search}" 검색 결과가 없어요` : filterTag !== '전체' ? `"${filterTag}" 태그 파일이 없어요` : filterDept !== '전체' ? `"${filterDept}" 부서 파일이 없어요` : '업로드된 파일이 없어요'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>파일을 업로드하면 AI가 자동으로 분류해줘요</p>
          </div>
        ) : filteredFiles.map(file => (
          <div key={file.id}
            style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.7fr 1.2fr 1fr', gap: '10px', padding: '12px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', background: 'var(--surface)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{getTypeIcon(file.original_name)}</span>
                <span style={{ fontSize: 'var(--font-size)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{file.original_name}</span>
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', paddingLeft: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.description}</span>
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{file.dept}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)' }}>{file.uploader}</span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{file.created_at}</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {file.tags?.filter(t => t.type !== 'date').slice(0, 3).map((t, i) => (
                <span key={i} style={{ fontSize: 'var(--font-size-sm)', padding: '2px 6px', borderRadius: '10px', background: t.type === 'dept' ? '#E6F1FB' : t.type === 'folder' ? 'var(--accent-light)' : 'var(--surface-alt)', color: t.type === 'dept' ? '#185FA5' : t.type === 'folder' ? 'var(--accent)' : 'var(--text-sub)' }}>
                  {t.tag}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
              {[
                { icon: '🕐', title: '버전 히스토리', action: () => handleHistory(file) },
                { icon: '⬇️', title: '다운로드', action: () => handleDownload(file) },
                { icon: '➕', title: '내 워크스페이스에 추가', action: () => handleAddToWorkspace(file) },
              ].map(btn => (
                <button key={btn.title} onClick={btn.action} title={btn.title}
                  style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-sub)' }}>
                  {btn.icon}
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => handleTrash(file)} title="휴지통으로 이동"
                  style={{ padding: '4px 8px', border: '1px solid var(--red-light)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--red)' }}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServerStorage