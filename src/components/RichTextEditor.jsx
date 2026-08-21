import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, Trash2 } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  // Keep editor content in sync with the value prop
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    let text = e.clipboardData.getData('text/plain');

    // Automatically decode if the content is URL-encoded
    try {
      if (/%[0-9a-fA-F]{2}/.test(text)) {
        text = decodeURIComponent(text);
      }
    } catch (err) {
      console.warn('URL decoding on paste failed, inserting raw text instead:', err);
    }

    // Safely escape HTML characters and convert newlines to <br> tags
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    document.execCommand('insertHTML', false, escaped);
  };

  return (
    <div className="w-full border border-[#E8DCD7] bg-white rounded-none focus-within:border-[#2C1E1B] transition-colors flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-[#FAF0EC] border-b border-[#E8DCD7] p-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 hover:bg-[#E8DCD7]/40 text-[#705B56] hover:text-[#2C1E1B] rounded-none transition-all flex items-center justify-center cursor-pointer"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 hover:bg-[#E8DCD7]/40 text-[#705B56] hover:text-[#2C1E1B] rounded-none transition-all flex items-center justify-center cursor-pointer"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-[#E8DCD7]/40 text-[#705B56] hover:text-[#2C1E1B] rounded-none transition-all flex items-center justify-center cursor-pointer"
          title="Bulleted List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 hover:bg-[#E8DCD7]/40 text-[#705B56] hover:text-[#2C1E1B] rounded-none transition-all ml-auto flex items-center justify-center cursor-pointer"
          title="Clear Formatting"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full min-h-[140px] max-h-[300px] overflow-y-auto px-4 py-3 text-xs text-[#2C1E1B] focus:outline-none bg-white font-sans leading-relaxed product-description-editor whitespace-pre-wrap"
        placeholder={placeholder}
      />
    </div>
  );
}
