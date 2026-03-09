"use client"

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
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
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import suggestion from "./mention-suggestion"
import api from "@/lib/axios"
import { ColorPicker } from "./editor/color-picker"
import { CommentMark } from "@/lib/editor/comment-mark"
import { InternalEmbedNode } from "@/lib/editor/internal-embed-node"
import { parseInternalUrl } from "@/lib/editor/internal-link-utils"
import { looksLikeMarkdown, markdownToHtml } from "@/lib/editor/markdown-paste"
import { HeadingWithAnchor } from "@/lib/editor/heading-anchor"
import { ImageWithBaseUrl } from "@/lib/editor/image-with-base-url"
import { CodeBlockNodeView } from "./editor/code-block-node-view"
import { PasteLinkPopover } from "./editor/paste-link-popover"
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
  onCollaboratorsChange?: (users: { name: string; color: string }[]) => void
  onCommentMarkClick?: (markId: string) => void
  titleSlot?: React.ReactNode
  contentClassName?: string
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
    const url = res.data.url as string
    // Server returns relative path like /api/files/... — prepend API base URL
    if (url.startsWith("/")) {
      return `${process.env.NEXT_PUBLIC_API_URL}${url}`
    }
    return url
  } catch (e) {
    console.error("Image upload failed:", e)
    return null
  }
}

/**
 * Outer wrapper: handles collab token fetch + provider setup.
 * Renders loading state until provider is ready, then mounts the inner editor
 * exactly once — avoiding the tiptap reconfigure crash.
 */
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
  onCollaboratorsChange,
  onCommentMarkClick,
  titleSlot,
  contentClassName,
}: CollaborativeEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [collabToken, setCollabToken] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<{ name: string; color: string }[]>([])
  const color = useRef(userColor || getRandomColor())

  useEffect(() => {
    onCollaboratorsChange?.(collaborators)
  }, [collaborators, onCollaboratorsChange])

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

    setCollaborators([]);

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

  // Show loading until provider is ready
  if (!provider) {
    return (
      <div className={cn("relative border rounded-md bg-background flex items-center justify-center", className)} style={{ minHeight }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Provider is guaranteed non-null — mount inner editor once
  return (
    <CollaborativeEditorInner
      provider={provider}
      connected={connected}
      collaborators={collaborators}
      userName={userName}
      userColor={color.current}
      content={content}
      placeholder={placeholder}
      minHeight={minHeight}
      className={className}
      editable={editable}
      mentions={mentions}
      showToolbar={showToolbar}
      onImageClick={onImageClick}
      onAddComment={onAddComment}
      onCommentMarkClick={onCommentMarkClick}
      titleSlot={titleSlot}
      contentClassName={contentClassName}
    />
  )
}

/**
 * Inner editor: created exactly once with provider already available.
 * No dependency-array-driven recreation — the editor is stable.
 */
function CollaborativeEditorInner({
  provider,
  connected,
  collaborators,
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
  onCommentMarkClick,
  titleSlot,
  contentClassName,
}: {
  provider: HocuspocusProvider
  connected: boolean
  collaborators: { name: string; color: string }[]
  userName: string
  userColor: string
  content?: Record<string, unknown> | null
  placeholder?: string
  minHeight?: string
  className?: string
  editable?: boolean
  mentions?: { id: string; name: string; email: string }[]
  showToolbar?: boolean
  onImageClick?: (src: string) => void
  onAddComment?: (data: { markId: string; quotedText: string }) => void
  onCommentMarkClick?: (markId: string) => void
  titleSlot?: React.ReactNode
  contentClassName?: string
}) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const [pastePopover, setPastePopover] = useState<{
    position: { top: number; left: number }
    url: string
    parsed: ReturnType<typeof parseInternalUrl>
  } | null>(null)

  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        ...({ history: false } as any),
      }),
      HeadingWithAnchor,
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
      ImageWithBaseUrl,
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
      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockNodeView)
        },
      }),
      CommentMark,
      InternalEmbedNode,
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: userName, color: userColor },
      }),
    ]

    if (mentions) {
      exts.push(
        Mention.configure({
          HTMLAttributes: { class: "mention" },
          suggestion: { char: "@", ...suggestion(mentions) },
        })
      )
    }

    return exts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Created once — provider is stable for this component's lifetime

  const editor = useEditor({
    extensions,
    content: undefined, // Collaboration provides content via Y.Doc
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
      handlePaste: (view, event) => {
        // Check for internal URL paste — only if the plain text is a bare URL
        const text = event.clipboardData?.getData("text/plain")?.trim()
        if (text && /^(https?:\/\/\S+|\/\S+)$/.test(text)) {
          const parsed = parseInternalUrl(text)
          if (parsed) {
            event.preventDefault()
            const coords = view.coordsAtPos(view.state.selection.from)
            setPastePopover({
              position: { top: coords.bottom + 4, left: coords.left },
              url: text,
              parsed,
            })
            return true
          }
        }

        // Auto-format pasted markdown (only when no HTML is provided)
        const hasHtml = !!event.clipboardData?.getData("text/html")
        if (text && !hasHtml && looksLikeMarkdown(text)) {
          event.preventDefault()
          if (editorRef.current) {
            editorRef.current.commands.insertContent(markdownToHtml(text), {
              parseOptions: { preserveWhitespace: false },
            })
          }
          return true
        }

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
  })

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

  const handlePastePopoverSelect = useCallback(
    (choice: "embed" | "link") => {
      if (!pastePopover?.parsed || !editorRef.current) return
      const ed = editorRef.current
      if (choice === "embed") {
        ed.chain()
          .focus()
          .insertInternalEmbed({
            entityType: pastePopover.parsed.type,
            entityId: pastePopover.parsed.entityId,
            workspaceId: pastePopover.parsed.workspaceId,
          })
          .run()
      } else {
        ed.chain()
          .focus()
          .insertContent({
            type: "text",
            text: pastePopover.url,
            marks: [{ type: "link", attrs: { href: pastePopover.url } }],
          })
          .run()
      }
      setPastePopover(null)
    },
    [pastePopover]
  )

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement

    // Check for anchor link click — scroll to heading instead of navigating
    const anchor = target.closest("a") as HTMLAnchorElement | null
    if (anchor) {
      const href = anchor.getAttribute("href")
      if (href?.startsWith("#")) {
        e.preventDefault()
        e.stopPropagation()
        const id = href.slice(1)
        const heading = document.getElementById(id)
        if (heading) heading.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
    }

    // Check for comment highlight click
    const commentEl = target.closest("[data-comment-id]") as HTMLElement | null
    if (commentEl && onCommentMarkClick) {
      const markId = commentEl.getAttribute("data-comment-id")
      if (markId) onCommentMarkClick(markId)
    }

    // Check for image click
    if (onImageClick && target.tagName === "IMG") {
      e.preventDefault()
      e.stopPropagation()
      const src = (target as HTMLImageElement).src
      if (src) onImageClick(src)
    }
  }, [onImageClick, onCommentMarkClick])

  if (!editor) return null

  return (
    <div className={cn("relative bg-background", className)} onClick={handleEditorClick}>
      {showToolbar && editable && (
        <div className="flex items-center gap-0.5 flex-wrap border-b p-2 bg-background sticky top-0 z-10">
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
                {collaborators.slice(0, 5).map((c) => (
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
      {titleSlot}
      <div className={contentClassName}>
        <EditorContent editor={editor} />
      </div>
      {pastePopover && (
        <PasteLinkPopover
          position={pastePopover.position}
          onSelect={handlePastePopoverSelect}
          onDismiss={() => setPastePopover(null)}
        />
      )}
    </div>
  )
}
