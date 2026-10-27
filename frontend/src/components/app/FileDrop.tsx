import { useRef, useState } from "react"
import { FileUp } from "lucide-react"

const MAX_MB = 5
const ACCEPT = [".pdf", ".docx"]

/** Drag-and-drop or click to choose a PDF/DOCX. Checks type and size before upload. */
export function FileDrop({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  function take(file: File | undefined) {
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    if (!ACCEPT.includes(ext)) return setProblem("Choose a .pdf or .docx file.")
    if (file.size > MAX_MB * 1024 * 1024) return setProblem(`The file is larger than ${MAX_MB} MB.`)
    setProblem(null)
    onFile(file)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          take(e.dataTransfer.files[0])
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-sm text-mist/80 transition-colors focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none disabled:opacity-50 ${
          dragging ? "border-cyan bg-cyan/10" : "border-white/20 hover:bg-white/5"
        }`}
      >
        <FileUp className="size-5 text-cyan" aria-hidden />
        <span>Drop a PDF or DOCX here, or click to choose one</span>
        <span className="text-xs text-mist/50">Up to {MAX_MB} MB. Scanned PDFs are not supported.</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {problem && <p className="mt-2 text-sm text-danger" role="alert">{problem}</p>}
    </div>
  )
}
