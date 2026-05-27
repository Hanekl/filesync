import { useState, useEffect } from 'react'


function Schedule({ currentUser, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [tags, setTags] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState({ title: '', time: '', memo: '', tag_id: null })
  const [tagForm, setTagForm] = useState({ name: '', color: '#534AB7' })
  const [filterTagId, setFilterTagId] = useState(null)
  const [showInlineTagForm, setShowInlineTagForm] = useState(false)
  const [showModalTagForm, setShowModalTagForm] = useState(false)
  const [inlineTagForm, setInlineTagForm] = useState({ name: '', color: '#534AB7' })
  const [confirmModal, setConfirmModal] = useState(null)

  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const fetchSchedules = () => {
    fetch(`${process.env.REACT_APP_API_URL}/schedules/${currentUser.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSchedules(data) })
  }

  const fetchTags = () => {
    fetch(`${process.env.REACT_APP_API_URL}/schedule-tags/${currentUser.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTags(data) })
  }

  useEffect(() => { fetchSchedules(); fetchTags()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedDateStr = formatDate(selectedDate)
  const todaySchedules = schedules
    .filter(s => s.date === selectedDateStr && (!filterTagId || s.tag_id === filterTagId))
    .sort((a, b) => {
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

  const handleSaveSchedule = () => {
    if (!form.title.trim()) return
    const method = editingSchedule ? 'PUT' : 'POST'
    const url = editingSchedule
      ? `${process.env.REACT_APP_API_URL}/schedules/${editingSchedule.id}`
      : `${process.env.REACT_APP_API_URL}/schedules`
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, title: form.title, date: selectedDateStr, time: form.time || null, memo: form.memo, tag_id: form.tag_id || null })
    }).then(() => {
      fetchSchedules()
      setShowAddModal(false)
      setForm({ title: '', time: '', memo: '', tag_id: null })
      setEditingSchedule(null)
    })
  }

  const handleToggleDone = (s) => {
    fetch(`${process.env.REACT_APP_API_URL}/schedules/${s.id}/done`, { method: 'POST' })
      .then(() => fetchSchedules())
  }

  const handleDelete = (id) => {
    setConfirmModal({
      message: '일정을 삭제할까요?',
      onConfirm: () => {
        fetch(`${process.env.REACT_APP_API_URL}/schedules/${id}`, { method: 'DELETE' })
          .then(() => { fetchSchedules(); setConfirmModal(null) })
      }
    })
  }

  const handleAddTag = (form, callback) => {
    if (!form.name.trim()) return
    fetch(`${process.env.REACT_APP_API_URL}/schedule-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, name: form.name, color: form.color })
    }).then(r => r.json()).then(newTag => {
      fetchTags()
      if (callback) callback(newTag)
    })
  }
 
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* 왼쪽 - 일정 목록 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f8f8' }}>

        <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
            <span style={{ fontSize: '12px', color: '#aaa', fontWeight: '400', marginLeft: '8px' }}>{todaySchedules.length}개</span>
          </p>
          <button
            onClick={() => { setEditingSchedule(null); setForm({ title: '', time: '', memo: '', tag_id: null }); setShowAddModal(true) }}
            style={{ padding: '7px 14px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
            + 일정 추가
          </button>
        </div>

        {/* 태그 필터 */}
        <div style={{ padding: '8px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setFilterTagId(null)}
            style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid #ddd', background: !filterTagId ? '#534AB7' : 'white', color: !filterTagId ? 'white' : '#888', fontSize: '11px', cursor: 'pointer' }}>
            전체
          </button>
          {tags.map(tag => (
            <button key={tag.id} onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
              style={{ padding: '4px 10px', borderRadius: '12px', border: `1px solid ${tag.color}`, background: filterTagId === tag.id ? tag.color : 'white', color: filterTagId === tag.id ? 'white' : tag.color, fontSize: '11px', cursor: 'pointer' }}>
              {tag.name}
            </button>
          ))}

          {showInlineTagForm ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input value={inlineTagForm.name} onChange={e => setInlineTagForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { handleAddTag(inlineTagForm, () => { setShowInlineTagForm(false); setInlineTagForm({ name: '', color: '#534AB7' }) }) } if (e.key === 'Escape') setShowInlineTagForm(false) }}
                placeholder="태그 이름" autoFocus
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '11px', outline: 'none', width: '80px' }} />
              <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '6px', background: inlineTagForm.color, border: '1px solid #ddd', flexShrink: 0 }}>
                <input type="color" value={inlineTagForm.color} onChange={e => setInlineTagForm(p => ({ ...p, color: e.target.value }))}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
              <button onClick={() => handleAddTag(inlineTagForm, () => { setShowInlineTagForm(false); setInlineTagForm({ name: '', color: '#534AB7' }) })}
                style={{ padding: '4px 8px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>추가</button>
              <button onClick={() => setShowInlineTagForm(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', fontSize: '13px' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowInlineTagForm(true)}
              style={{ padding: '4px 10px', borderRadius: '12px', border: '1px dashed #ddd', background: 'white', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>
              + 태그 추가
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todaySchedules.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '60px', fontSize: '13px' }}>이날 일정이 없어요 😊</div>
          ) : todaySchedules.map(s => {
            const tag = tags.find(t => t.id === s.tag_id)
            return (
              <div key={s.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', opacity: s.is_done ? 0.5 : 1 }}>
                <button onClick={() => handleToggleDone(s)}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${tag?.color || '#534AB7'}`, background: s.is_done ? (tag?.color || '#534AB7') : 'white', cursor: 'pointer', flexShrink: 0, marginTop: '2px', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.is_done ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', textDecoration: s.is_done ? 'line-through' : 'none', color: '#333' }}>{s.title}</p>
                    {tag && (
                      <span style={{ padding: '2px 8px', borderRadius: '10px', background: tag.color + '22', color: tag.color, fontSize: '10px', fontWeight: '500' }}>{tag.name}</span>
                    )}
                  </div>
                  {s.time && <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>🕐 {s.time}</p>}
                  {s.memo && <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{s.memo}</p>}
                </div>
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <button onClick={() => { setEditingSchedule(s); setForm({ title: s.title, time: s.time || '', memo: s.memo || '', tag_id: s.tag_id }); setShowAddModal(true) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ccc', padding: '4px 6px', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#534AB7'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>✏️</button>
                  <button onClick={() => handleDelete(s.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ccc', padding: '4px 6px', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAddModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>{editingSchedule ? '✏️ 일정 수정' : '+ 일정 추가'}</p>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="일정 제목 *" autoFocus
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
            <input value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              placeholder="시간 입력 (예: 09:00, 오후 2시)"
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
            <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              placeholder="메모 (선택)" rows={3}
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none' }} />
            <div>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>태그 선택</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button onClick={() => setForm(p => ({ ...p, tag_id: null }))}
                  style={{ padding: '4px 12px', borderRadius: '12px', border: '1px solid #ddd', background: !form.tag_id ? '#f0effe' : 'white', color: !form.tag_id ? '#534AB7' : '#888', fontSize: '11px', cursor: 'pointer' }}>없음</button>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setForm(p => ({ ...p, tag_id: tag.id }))}
                    style={{ padding: '4px 12px', borderRadius: '12px', border: `1px solid ${tag.color}`, background: form.tag_id === tag.id ? tag.color : 'white', color: form.tag_id === tag.id ? 'white' : tag.color, fontSize: '11px', cursor: 'pointer' }}>
                    {tag.name}
                  </button>
                ))}
                {showModalTagForm ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input value={tagForm.name} onChange={e => setTagForm(p => ({ ...p, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Escape' && setShowModalTagForm(false)}
                      placeholder="태그 이름" autoFocus
                      style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '11px', outline: 'none', width: '80px' }} />
                    <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '6px', background: tagForm.color, border: '1px solid #ddd', flexShrink: 0 }}>
                      <input type="color" value={tagForm.color} onChange={e => setTagForm(p => ({ ...p, color: e.target.value }))}
                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    </div>
                    <button onClick={() => handleAddTag(tagForm, (newTag) => { setForm(p => ({ ...p, tag_id: newTag.id })); setShowModalTagForm(false); setTagForm({ name: '', color: '#534AB7' }) })}
                      style={{ padding: '4px 8px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>추가</button>
                    <button onClick={() => setShowModalTagForm(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', fontSize: '13px' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowModalTagForm(true)}
                    style={{ padding: '4px 12px', borderRadius: '12px', border: '1px dashed #ddd', background: 'white', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>
                    + 새 태그
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>취소</button>
              <button onClick={handleSaveSchedule}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#534AB7', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                {editingSchedule ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* 오른쪽 - 달력 */}
          <div style={{ width: '30%', minWidth: '280px', maxWidth: '420px', flexShrink: 0, background: 'white', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'auto' }}>
            {/* 달력 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
            <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#555', padding: '4px 8px' }}>‹</button>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
            </p>
            <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#555', padding: '4px 8px' }}>›</button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {['일','월','화','수','목','금','토'].map((d, i) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '500', color: i === 0 ? '#e53e3e' : i === 6 ? '#3182CE' : '#888', padding: '4px 0' }}>{d}</div>
            ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {(() => {
                const year = selectedDate.getFullYear()
                const month = selectedDate.getMonth()
                const firstDay = new Date(year, month, 1).getDay()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const today = new Date()
                const cells = []

                for (let i = 0; i < firstDay; i++) cells.push(null)
                for (let d = 1; d <= daysInMonth; d++) cells.push(d)

                return cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
                const isSelected = formatDate(selectedDate) === dateStr
                const dots = schedules.filter(s => s.date === dateStr)
                const col = i % 7

                return (
                    <div key={i} onClick={() => setSelectedDate(new Date(year, month, day))}
                    style={{ textAlign: 'center', padding: '4px 2px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? '#534AB7' : isToday ? '#f0effe' : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f5f5f5' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#f0effe' : 'transparent' }}>
                    <p style={{ fontSize: '12px', fontWeight: isToday ? '600' : '400', color: isSelected ? 'white' : col === 0 ? '#e53e3e' : col === 6 ? '#3182CE' : '#333' }}>
                        {day}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px', minHeight: '6px' }}>
                        {dots.slice(0, 3).map((s, idx) => {
                        const tag = tags.find(t => t.id === s.tag_id)
                        return <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'white' : (tag?.color || '#534AB7') }} />
                        })}
                    </div>
                    </div>
                )
                })
            })()}
            </div>
          </div>
          {confirmModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setConfirmModal(null)}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                onClick={e => e.stopPropagation()}>
                <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>{confirmModal.message}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setConfirmModal(null)}
                    style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                    취소
                  </button>
                  <button onClick={confirmModal.onConfirm}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#e53e3e', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '500' }}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}

export default Schedule