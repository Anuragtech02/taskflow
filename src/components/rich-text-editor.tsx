"use client"

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react"
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
import { useCallback, useRef, useState } from "react"
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, Table as TableIcon, Heading1, Heading2, Heading3, Undo, Redo } from "lucide-react"
import { cn } from "@/lib/utils"
import suggestion from "./mention-suggestion"
import api from "@/lib/axios"
import { CommentMark } from "@/lib/editor/comment-mark"
import { InternalEmbedNode } from "@/lib/editor/internal-embed-node"
import { parseInternalUrl } from "@/lib/editor/internal-link-utils"
import { looksLikeMarkdown, markdownToHtml } from "@/lib/editor/markdown-paste"
import { CodeBlockNodeView } from "./editor/code-block-node-view"
import { PasteLinkPopover } from "./editor/paste-link-popover"

const lowlight = createLowlight(common)

interface RichTextEditorProps {
  content: string | Record<string, unknown> | null
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  minHeight?: string
  className?: string
  editable?: boolean
  mentions?: { id: string; name: string; email: string }[]
  showToolbar?: boolean
  onImageClick?: (src: string) => void
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append("file", file)
  try {
    const res = await api.post("/upload", formData)
    const url = res.data.url as string
    if (url.startsWith("/")) {
      return `${process.env.NEXT_PUBLIC_API_URL}${url}`
    }
    return url
  } catch (e) {
    console.error("Image upload failed:", e)
    return null
  }
}

/** Fetch an external image URL and re-upload it to our storage */
async function reuploadExternalImage(src: string): Promise<string | null> {
  try {
    // Handle data: URIs
    if (src.startsWith("data:")) {
      const match = src.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) return null
      const mimeType = match[1]
      const base64 = match[2]
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const ext = mimeType.split("/")[1] || "png"
      const file = new File([bytes], `pasted.${ext}`, { type: mimeType })
      return uploadImage(file)
    }
    // Fetch external URL
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith("image/")) return null
    const ext = blob.type.split("/")[1]?.replace("+xml", "") || "png"
    const file = new File([blob], `pasted.${ext}`, { type: blob.type })
    return uploadImage(file)
  } catch (e) {
    console.error("Failed to re-upload image:", e)
    return null
  }
}

/** Process pasted HTML: find <img> tags and re-upload their sources */
async function processHtmlImages(html: string): Promise<string> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const imgs = doc.querySelectorAll("img")
  if (imgs.length === 0) return html

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.getAttribute("src")
      if (!src) return
      // Skip images already on our domain
      if (src.startsWith("/api/") || src.startsWith(window.location.origin)) return
      const newUrl = await reuploadExternalImage(src)
      if (newUrl) {
        img.setAttribute("src", newUrl)
      } else {
        // Remove broken images rather than keeping expired external URLs
        img.remove()
      }
    })
  )

  return doc.body.innerHTML
}

export function RichTextEditor({ content, onChange, placeholder, minHeight = "150px", className, editable = true, mentions, showToolbar = false, onImageClick }: RichTextEditorProps) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const [pastePopover, setPastePopover] = useState<{
    position: { top: number; left: number }
    url: string
    parsed: ReturnType<typeof parseInternalUrl>
  } | null>(null)

  // Build extensions array
  const extensions: any[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
    }),
    Placeholder.configure({ placeholder: placeholder || "Type something..." }),
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
    CodeBlockLowlight.configure({ lowlight }).extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockNodeView)
      },
    }),
    CommentMark,
    InternalEmbedNode,
  ]

  // Always add Mention extension (works with empty array too)
  extensions.push(
    Mention.configure({
      HTMLAttributes: {
        class: "mention",
      },
      suggestion: {
        char: "@",
        ...suggestion(mentions || []),
      },
    })
  )

  const editor = useEditor({
    extensions,
    content: content || "",
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
          // 1. Check for raw image files (e.g. screenshot paste)
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
          // 2. Check for HTML with embedded <img> tags (e.g. Google Docs paste)
          const html = event.clipboardData?.getData("text/html")
          if (html && /<img\s/i.test(html)) {
            event.preventDefault()
            processHtmlImages(html).then((cleanHtml) => {
              if (editorRef.current) {
                editorRef.current.commands.insertContent(cleanHtml, {
                  parseOptions: { preserveWhitespace: false },
                })
              }
            })
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON())
    },
  })

  // Keep ref in sync
  editorRef.current = editor

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
          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50"><Undo className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50"><Redo className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}><Heading1 className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}><Heading2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 3 }) && "bg-muted text-primary")}><Heading3 className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-4 w-4" /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-4 w-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button type="button" onClick={addLink} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("link") && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></button>
          <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-4 w-4" /></button>
          <button type="button" onClick={insertTable} className="p-1.5 rounded hover:bg-muted"><TableIcon className="h-4 w-4" /></button>
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
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
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
