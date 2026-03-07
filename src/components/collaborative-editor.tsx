"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import Typography from "@tiptap/extension-typography"
import Mention from "@tiptap/extension-mention"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { nanoid } from "nanoid"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Image as ImageIcon, Link as LinkIcon, Table as TableIcon,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Palette, CheckSquare, MessageSquarePlus, Minus, Braces,
} from "lucide-react"
import { cn } from "@/lib/utils"
import suggestion from "./mention-suggestion"
import api from "@/lib/axios"
import { ColorPicker } from "./editor/color-picker"
import { CommentMark } from "@/lib/editor/comment-mark"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const lowlight = createLowlight(common)

interface CollaborativeEditorProps {
  documentId: string
  userName: string
  userColor?: string
  content?: Record<string, unknown> | null
  placeholder?: string
  minHeight?: string
  className?: string
  editable?: boolean
  mentions?: { id: string; name: string; email: string }[]
  showToolbar?: boolean
  onImageClick?: (src: string) => void
  onAddComment?: (data: { markId: string; quotedText: string }) => void
}

const CURSOR_COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80",
  "#22d3ee", "#818cf8", "#e879f9", "#fb7185",
]

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append("file", file)
  try {
    const res = await api.post("/upload", formData)
    return res.data.url
  } catch (e) {
    console.error("Image upload failed:", e)
    return null
  }
}

export function CollaborativeEditor({
  documentId,
  userName,
  userColor,
  content,
  placeholder,
  minHeight = "150px",
  className,
  editable = true,
  mentions,
  showToolbar = true,
  onImageClick,
  onAddComment,
}: CollaborativeEditorProps) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  // Fix: use useState instead of useRef so React re-renders when provider is ready
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [collabToken, setCollabToken] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<{ name: string; color: string }[]>([])
  const color = useRef(userColor || getRandomColor())

  // Fetch collab token
  useEffect(() => {
    let cancelled = false
    async function fetchToken() {
      try {
        const res = await api.post(`/documents/${documentId}/collab-token`)
        if (!cancelled) setCollabToken(res.data.token)
      } catch (err) {
        console.error("Failed to get collab token:", err)
      }
    }
    fetchToken()
    return () => { cancelled = true }
  }, [documentId])

  // Set up Hocuspocus provider
  useEffect(() => {
    if (!collabToken) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      ? process.env.NEXT_PUBLIC_WS_URL
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`

    const p = new HocuspocusProvider({
      url: `${wsUrl}/collab`,
      name: documentId,
      token: collabToken,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onAwarenessUpdate: ({ states }) => {
        const users = Array.from(states.values())
          .filter((s: any) => s.user)
          .map((s: any) => ({ name: s.user.name, color: s.user.color }))
        setCollaborators(users)
      },
    })

    setProvider(p)

    return () => {
      p.destroy()
      setProvider(null)
    }
  }, [collabToken, documentId])

  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
        ...({ history: false } as any),
      }),
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Typography,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Superscript,
      Subscript,
      CodeBlockLowlight.configure({ lowlight }),
      CommentMark,
    ]

    if (mentions) {
      exts.push(
        Mention.configure({
          HTMLAttributes: { class: "mention" },
          suggestion: { char: "@", ...suggestion(mentions) },
        })
      )
    }

    if (provider) {
      exts.push(
        Collaboration.configure({
          document: provider.document,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: { name: userName, color: color.current },
        })
      )
    }

    return exts
  }, [provider, mentions, placeholder, userName])

  const editor = useEditor({
    extensions,
    content: provider ? undefined : content || "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none p-3",
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith("image/")) {
            event.preventDefault()
            uploadImage(file).then((url) => {
              if (url && editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url }).run()
              }
            })
            return true
          }
        }
        return false
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                uploadImage(file).then((url) => {
                  if (url && editorRef.current) {
                    editorRef.current.chain().focus().setImage({ src: url }).run()
                  }
                })
                return true
              }
            }
          }
        }
        return false
      },
    },
  }, [provider])

  // Keep ref in sync via effect, not during render
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const addImage = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = await uploadImage(file)
        if (url && editorRef.current) {
          editorRef.current.chain().focus().setImage({ src: url }).run()
        }
      }
    }
    input.click()
  }, [])

  const addLink = useCallback(() => {
    const url = window.prompt("Enter URL")
    if (url && editorRef.current) {
      editorRef.current.chain().focus().setLink({ href: url }).run()
    }
  }, [])

  const insertTable = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }, [])

  const handleAddComment = useCallback(() => {
    if (!editor || !onAddComment) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const quotedText = editor.state.doc.textBetween(from, to, " ")
    const markId = nanoid()
    editor.chain().focus().setCommentMark(markId).run()
    onAddComment({ markId, quotedText })
  }, [editor, onAddComment])

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    if (!onImageClick) return
    const target = e.target as HTMLElement
    if (target.tagName === "IMG") {
      e.preventDefault()
      e.stopPropagation()
      const src = (target as HTMLImageElement).src
      if (src) onImageClick(src)
    }
  }, [onImageClick])

  if (!editor) return null

  return (
    <div className={cn("relative border rounded-md bg-background", className)} onClick={handleEditorClick}>
      {showToolbar && editable && (
        <div className="flex items-center gap-0.5 flex-wrap border-b p-2 bg-muted/30 rounded-t-md">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Text color */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="p-1.5 rounded hover:bg-muted"><Palette className="h-4 w-4" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <ColorPicker
                activeColor={editor.getAttributes("textStyle").color}
                onSelect={(c) => editor.chain().focus().setColor(c).run()}
                onClear={() => editor.chain().focus().unsetColor().run()}
              />
            </PopoverContent>
          </Popover>

          {/* Highlight color */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("highlight") && "bg-muted text-primary")}><Highlighter className="h-4 w-4" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <ColorPicker
                activeColor={editor.getAttributes("highlight").color}
                onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
                onClear={() => editor.chain().focus().unsetHighlight().run()}
              />
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}><Heading1 className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}><Heading2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 3 }) && "bg-muted text-primary")}><Heading3 className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Alignment */}
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive({ textAlign: "left" }) && "bg-muted text-primary")}><AlignLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive({ textAlign: "center" }) && "bg-muted text-primary")}><AlignCenter className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive({ textAlign: "right" }) && "bg-muted text-primary")}><AlignRight className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />

          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("taskList") && "bg-muted text-primary")}><CheckSquare className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("codeBlock") && "bg-muted text-primary")}><Braces className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1.5 rounded hover:bg-muted"><Minus className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={addLink} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("link") && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></button>
          <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-4 w-4" /></button>
          <button type="button" onClick={insertTable} className="p-1.5 rounded hover:bg-muted"><TableIcon className="h-4 w-4" /></button>

          {/* Connection status and collaborators */}
          <div className="ml-auto flex items-center gap-2">
            {collaborators.length > 1 && (
              <div className="flex -space-x-1.5">
                {collaborators.slice(0, 5).map((c, i) => (
                  <div
                    key={`${c.name}-${c.color}`}
                    className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 5 && (
                  <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                    +{collaborators.length - 5}
                  </div>
                )}
              </div>
            )}
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500" : "bg-yellow-500")} title={connected ? "Connected" : "Connecting..."} />
          </div>
        </div>
      )}
      {editor && editable && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}>H1</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}>H2</button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-3.5 w-3.5" /></button>
            {onAddComment && (
              <>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button type="button" onClick={handleAddComment} className="p-1.5 rounded hover:bg-muted" title="Add comment">
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
