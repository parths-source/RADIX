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
        className={`group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-sm text-ink-soft transition duration-200 focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:outline-none disabled:opacity-50 ${
          dragging ? "border-accent bg-accent/5" : "border-line-strong bg-paper/60 hover:border-accent/60 hover:bg-tint/70"
        }`}
      >
        <span
          aria-hidden
          className={`flex size-12 items-center justify-center rounded-2xl shadow-sm transition duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${
            dragging ? "bg-gradient-to-br from-accent to-sky text-white" : "bg-gradient-to-br from-[#dfe8ff] to-[#f4f7ff] text-accent group-hover:from-accent group-hover:to-sky group-hover:text-white"
          }`}
        >
          <FileUp className="size-6" />
        </span>
        <span className="font-medium text-ink">
          Drop a PDF or DOCX here, or <span className="text-accent underline-offset-2 group-hover:underline">click to choose one</span>
        </span>
        <span className="text-xs text-ink-muted">Up to {MAX_MB} MB. Scanned PDFs are not supported.</span>
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
      {problem && <p className="mt-2 text-sm text-danger-ink" role="alert">{problem}</p>}
    </div>
  )
}
