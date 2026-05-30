import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { getApiUrl } from './config'

const MEMO_COLORS = ['#FAEEDA', '#E1F5EE', '#EEEDFE', '#FFF5F5', '#E8F4FD', '#F5F5F5']

function MemoPanel({ memo, currentUser, onClose, onHeaderMouseDown, isFloating, onSaved }) {
  const [memoForm, setMemoForm] = useState({ title: memo.title || '', content: memo.content || '', color: memo.color || '#FAEEDA' })
  const [autoSaved, setAutoSaved] = useState(false)
  const autoSaveTimer = useRef(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: memoForm.content,
    onUpdate: ({ editor }) => {
      const updated = { ...memoForm, content: editor.getHTML() }
      setMemoForm(updated)
      triggerAutoSave(updated)
    }
  })

  useEffect(() => {
    if (editor && memo.content !== editor.getHTML()) editor.commands.setContent(memo.content || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id])

  const triggerAutoSave = (form) => {
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => handleSave(form), 1000)
  }

  const handleSave = (form = memoForm) => {
    fetch(`${getApiUrl()}/memos/${memo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, content: form.content, color: form.color })
    }).then(() => { setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); onSaved?.() })
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: memoForm.color }}>

      {/* 헤더 */}
      <div onMouseDown={onHeaderMouseDown}
        style={{ height: '44px', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', flexShrink: 0, cursor: 'grab', background: 'rgba(255,255,255,0.5)' }}>
        <span style={{ fontSize: 'var(--font-size)', fontWeight: '500', flex: 1, userSelect: 'none', color: '#333' }}>
          ⠿ 📝 {memoForm.title || '제목 없음'}
        </span>
        {autoSaved && <span style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>✅ 저장됨</span>}
        <button onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#666' }}>✕</button>
      </div>

      {/* 툴바 */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
        {MEMO_COLORS.map(c => (
          <button key={c} onClick={() => setMemoForm(prev => ({ ...prev, color: c }))}
            style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: memoForm.color === c ? '2px solid var(--accent)' : '2px solid rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0 }} />
        ))}
        <div style={{ width: '1px', height: '18px', background: 'rgba(0,0,0,0.1)' }} />
        {[
          { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), style: { fontWeight: 'bold' } },
          { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), style: { fontStyle: 'italic' } },
          { label: 'S', action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike'), style: { textDecoration: 'line-through' } },
          { label: '•', action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ padding: '3px 7px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', background: btn.active ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', ...btn.style }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* 제목 */}
      <input value={memoForm.title}
        onChange={e => { const updated = { ...memoForm, title: e.target.value }; setMemoForm(updated); triggerAutoSave(updated) }}
        placeholder="제목 입력..."
        style={{ padding: '14px 16px', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: 'var(--font-size-lg)', fontWeight: '600', outline: 'none', background: 'transparent', flexShrink: 0, color: '#333' }} />

      {/* 에디터 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        <EditorContent editor={editor} />
      </div>

      {/* 하단 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
        <button onClick={() => handleSave()}
          style={{ padding: '7px 18px', border: 'none', borderRadius: '8px', background: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--accent-text)', fontWeight: '500' }}>
          저장
        </button>
      </div>
    </div>
  )
}

export default MemoPanel