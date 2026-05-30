import { useState, useEffect } from 'react'
import { getApiUrl } from './config'

function Schedule({ currentUser, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [tags, setTags] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState({ title: '', time: '', memo: '', tag_id: null })
  const [tagForm, setTagForm] = useState({ name: '', color: 'var(--accent)' })
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
    fetch(`${getApiUrl()}/schedules/${currentUser.id}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setSchedules(data) })
  }
  const fetchTags = () => {
    fetch(`${getApiUrl()}/schedule-tags/${currentUser.id}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setTags(data) })
  }

  useEffect(() => { fetchSchedules(); fetchTags() }, []) // eslint-disable-line

  const selectedDateStr = formatDate(selectedDate)
  const todaySchedules = schedules.filter(s => s.date === selectedDateStr && (!filterTagId || s.tag_id === filterTagId)).sort((a, b) => { if (!a.time) return 1; if (!b.time) return -1; return a.time.localeCompare(b.time) })

  const handleSaveSchedule = () => {
    if (!form.title.trim()) return
    const method = editingSchedule ? 'PUT' : 'POST'
    const url = editingSchedule ? `${getApiUrl()}/schedules/${editingSchedule.id}` : `${getApiUrl()}/schedules`
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, title: form.title, date: selectedDateStr, time: form.time || null, memo: form.memo, tag_id: form.tag_id || null }) })
      .then(() => { fetchSchedules(); setShowAddModal(false); setForm({ title: '', time: '', memo: '', tag_id: null }); setEditingSchedule(null) })
  }

  const handleToggleDone = (s) => { fetch(`${getApiUrl()}/schedules/${s.id}/done`, { method: 'POST' }).then(() => fetchSchedules()) }

  const handleDelete = (id) => {
    setConfirmModal({ message: '일정을 삭제할까요?', onConfirm: () => {
      fetch(`${getApiUrl()}/schedules/${id}`, { method: 'DELETE' }).then(() => { fetchSchedules(); setConfirmModal(null) })
    }})
  }

  const handleAddTag = (form, callback) => {
    if (!form.name.trim()) return
    fetch(`${getApiUrl()}/schedule-tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, name: form.name, color: form.color }) })
      .then(r => r.json()).then(newTag => { fetchTags(); if (callback) callback(newTag) })
  }

  const inputStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size)', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }
  const modalStyle = { background: 'var(--surface)', borderRadius: '12px', padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '14px', color: 'var(--text)' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* 오른쪽 - 달력 */}
      <div style={{ width: '30%', minWidth: '280px', maxWidth: '420px', flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
          <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-sub)', padding: '4px 8px' }}>‹</button>
          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--text)' }}>
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </p>
          <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-sub)', padding: '4px 8px' }}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
          {['일','월','화','수','목','금','토'].map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: '500', color: i === 0 ? 'var(--red)' : i === 6 ? '#3182CE' : 'var(--text-sub)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

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
                  style={{ textAlign: 'center', padding: '4px 2px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-light)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-alt)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'var(--accent-light)' : 'transparent' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: isToday ? '600' : '400', color: isSelected ? 'var(--accent-text)' : col === 0 ? 'var(--red)' : col === 6 ? '#3182CE' : 'var(--text)' }}>
                    {day}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px', minHeight: '6px' }}>
                    {dots.slice(0, 3).map((s, idx) => {
                      const tag = tags.find(t => t.id === s.tag_id)
                      return <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'var(--accent-text)' : (tag?.color || 'var(--accent)') }} />
                    })}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>


      {/* 왼쪽 - 일정 목록 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--text)' }}>
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '8px' }}>{todaySchedules.length}개</span>
          </p>
          <button onClick={() => { setEditingSchedule(null); setForm({ title: '', time: '', memo: '', tag_id: null }); setShowAddModal(true) }}
            style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
            + 일정 추가
          </button>
        </div>

        {/* 태그 필터 */}
        <div style={{ padding: '8px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setFilterTagId(null)}
            style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border)', background: !filterTagId ? 'var(--accent)' : 'var(--surface)', color: !filterTagId ? 'var(--accent-text)' : 'var(--text-sub)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
            전체
          </button>
          {tags.map(tag => (
            <button key={tag.id} onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
              style={{ padding: '4px 10px', borderRadius: '12px', border: `1px solid ${tag.color}`, background: filterTagId === tag.id ? tag.color : 'transparent', color: filterTagId === tag.id ? 'white' : tag.color, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              {tag.name}
            </button>
          ))}
          {showInlineTagForm ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input value={inlineTagForm.name} onChange={e => setInlineTagForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { handleAddTag(inlineTagForm, () => { setShowInlineTagForm(false); setInlineTagForm({ name: '', color: '#534AB7' }) }) } if (e.key === 'Escape') setShowInlineTagForm(false) }}
                placeholder="태그 이름" autoFocus
                style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size-sm)', outline: 'none', width: '80px', background: 'var(--surface)', color: 'var(--text)' }} />
              <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '6px', background: inlineTagForm.color, border: '1px solid var(--border)', flexShrink: 0 }}>
                <input type="color" value={inlineTagForm.color} onChange={e => setInlineTagForm(p => ({ ...p, color: e.target.value }))}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
              <button onClick={() => handleAddTag(inlineTagForm, () => { setShowInlineTagForm(false); setInlineTagForm({ name: '', color: '#534AB7' }) })}
                style={{ padding: '4px 8px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>추가</button>
              <button onClick={() => setShowInlineTagForm(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowInlineTagForm(true)}
              style={{ padding: '4px 10px', borderRadius: '12px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              + 태그 추가
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todaySchedules.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px', fontSize: 'var(--font-size)' }}>이날 일정이 없어요 😊</div>
          ) : todaySchedules.map(s => {
            const tag = tags.find(t => t.id === s.tag_id)
            return (
              <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', opacity: s.is_done ? 0.5 : 1 }}>
                <button onClick={() => handleToggleDone(s)}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${tag?.color || 'var(--accent)'}`, background: s.is_done ? (tag?.color || 'var(--accent)') : 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: '2px', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.is_done ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 'var(--font-size)', fontWeight: '500', textDecoration: s.is_done ? 'line-through' : 'none', color: 'var(--text)' }}>{s.title}</p>
                    {tag && <span style={{ padding: '2px 8px', borderRadius: '10px', background: tag.color + '22', color: tag.color, fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>{tag.name}</span>}
                  </div>
                  {s.time && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>🕐 {s.time}</p>}
                  {s.memo && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', marginTop: '4px' }}>{s.memo}</p>}
                </div>
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <button onClick={() => { setEditingSchedule(s); setForm({ title: s.title, time: s.time || '', memo: s.memo || '', tag_id: s.tag_id }); setShowAddModal(true) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--border)', padding: '4px 6px', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--border)'}>✏️</button>
                  <button onClick={() => handleDelete(s.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--border)', padding: '4px 6px', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--border)'}>🗑️</button>
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
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>{editingSchedule ? '✏️ 일정 수정' : '+ 일정 추가'}</p>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="일정 제목 *" autoFocus style={inputStyle} />
            <input value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              placeholder="시간 입력 (예: 09:00, 오후 2시)" style={inputStyle} />
            <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              placeholder="메모 (선택)" rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-sub)', marginBottom: '8px' }}>태그 선택</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button onClick={() => setForm(p => ({ ...p, tag_id: null }))}
                  style={{ padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border)', background: !form.tag_id ? 'var(--accent-light)' : 'var(--surface)', color: !form.tag_id ? 'var(--accent)' : 'var(--text-sub)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>없음</button>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setForm(p => ({ ...p, tag_id: tag.id }))}
                    style={{ padding: '4px 12px', borderRadius: '12px', border: `1px solid ${tag.color}`, background: form.tag_id === tag.id ? tag.color : 'transparent', color: form.tag_id === tag.id ? 'white' : tag.color, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                    {tag.name}
                  </button>
                ))}
                {showModalTagForm ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input value={tagForm.name} onChange={e => setTagForm(p => ({ ...p, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Escape' && setShowModalTagForm(false)}
                      placeholder="태그 이름" autoFocus
                      style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 'var(--font-size-sm)', outline: 'none', width: '80px', background: 'var(--surface)', color: 'var(--text)' }} />
                    <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '6px', background: tagForm.color, border: '1px solid var(--border)', flexShrink: 0 }}>
                      <input type="color" value={tagForm.color} onChange={e => setTagForm(p => ({ ...p, color: e.target.value }))}
                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    </div>
                    <button onClick={() => handleAddTag(tagForm, (newTag) => { setForm(p => ({ ...p, tag_id: newTag.id })); setShowModalTagForm(false); setTagForm({ name: '', color: '#534AB7' }) })}
                      style={{ padding: '4px 8px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>추가</button>
                    <button onClick={() => setShowModalTagForm(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowModalTagForm(true)}
                    style={{ padding: '4px 12px', borderRadius: '12px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                    + 새 태그
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
              <button onClick={handleSaveSchedule}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--accent-text)', fontWeight: '500' }}>
                {editingSchedule ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}


      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 'var(--font-size)', color: 'var(--text-sub)', lineHeight: '1.6' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'var(--text-sub)' }}>취소</button>
              <button onClick={confirmModal.onConfirm}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--red)', cursor: 'pointer', fontSize: 'var(--font-size)', color: 'white', fontWeight: '500' }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedule