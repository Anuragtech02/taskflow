"use client"

import api from "@/lib/axios"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, MessageSquare, Reply, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface CommentUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface CommentReply {
  id: string
  content: string
  createdAt: string
  user: CommentUser
}

interface Comment {
  id: string
  content: string
  markId: string | null
  quotedText: string | null
  resolved: boolean
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  user: CommentUser
  replies: CommentReply[]
}

export interface PendingComment {
  markId: string
  quotedText: string
}

interface CommentsSidebarProps {
  documentId: string
  currentUserId: string
  open: boolean
  onClose: () => void
  pendingComment?: PendingComment | null
  onPendingCommentClear?: () => void
  onCommentClick?: (markId: string) => void
  activeCommentMarkId?: string | null
  onActiveCommentClear?: () => void
}

export function CommentsSidebar({ documentId, currentUserId, open, onClose, pendingComment, onPendingCommentClear, onCommentClick, activeCommentMarkId, onActiveCommentClear }: CommentsSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [showResolved, setShowResolved] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/documents/${documentId}/comments`)
      setComments(res.data.comments)
    } catch (err) {
      console.error("Failed to fetch comments:", err)
    }
  }, [documentId])

  useEffect(() => {
    if (open) fetchComments()
  }, [open, fetchComments])

  const newCommentRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus when pending comment arrives
  useEffect(() => {
    if (pendingComment) {
      setNewComment("")
      setTimeout(() => newCommentRef.current?.focus(), 0)
    }
  }, [pendingComment])

  // Scroll to active comment when clicking highlighted text
  useEffect(() => {
    if (!activeCommentMarkId || !open) return
    // Find the comment matching this markId
    const comment = comments.find((c) => c.markId === activeCommentMarkId)
    if (comment) {
      const el = commentRefs.current.get(comment.id)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [activeCommentMarkId, open, comments])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const body: Record<string, string> = { content: newComment.trim() }
      if (pendingComment) {
        body.markId = pendingComment.markId
        body.quotedText = pendingComment.quotedText
      }
      await api.post(`/documents/${documentId}/comments`, body)
      setNewComment("")
      onPendingCommentClear?.()
      fetchComments()
    } catch (err) {
      console.error("Failed to add comment:", err)
    }
  }

  const handleReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return
    try {
      await api.post(`/documents/${documentId}/comments`, { content: replyContent.trim(), parentCommentId })
      setReplyContent("")
      setReplyingTo(null)
      fetchComments()
    } catch (err) {
      console.error("Failed to reply:", err)
    }
  }

  const handleResolve = async (commentId: string, resolved: boolean) => {
    setLoadingIds((prev) => new Set(prev).add(commentId))
    try {
      await api.patch(`/documents/${documentId}/comments/${commentId}`, { resolved })
      await fetchComments()
    } catch (err) {
      console.error("Failed to resolve:", err)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(commentId)
        return next
      })
    }
  }

  const handleDelete = async (commentId: string) => {
    setLoadingIds((prev) => new Set(prev).add(commentId))
    try {
      await api.delete(`/documents/${documentId}/comments/${commentId}`)
      await fetchComments()
    } catch (err) {
      console.error("Failed to delete:", err)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(commentId)
        return next
      })
    }
  }

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved)

  if (!open) return null

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium text-sm">Comments</span>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showResolved ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredComments.map((comment) => {
          const isLoading = loadingIds.has(comment.id)
          const isActive = activeCommentMarkId != null && comment.markId === activeCommentMarkId
          return (
            <div
              key={comment.id}
              ref={(el) => {
                if (el) commentRefs.current.set(comment.id, el)
                else commentRefs.current.delete(comment.id)
              }}
              className={cn(
                "rounded-lg border p-3 space-y-2 transition-all duration-300",
                comment.resolved && "opacity-60",
                isLoading && "opacity-40 pointer-events-none",
                isActive && "ring-2 ring-yellow-500/50 border-yellow-500/50",
                comment.markId && onCommentClick && "cursor-pointer hover:border-primary/50"
              )}
              onClick={() => {
                if (comment.markId) {
                  onCommentClick?.(comment.markId)
                  onActiveCommentClear?.()
                }
              }}
            >
              {/* Quoted text */}
              {comment.quotedText && (
                <div className="text-xs bg-yellow-500/10 border-l-2 border-yellow-500 px-2 py-1 rounded">
                  &ldquo;{comment.quotedText}&rdquo;
                </div>
              )}

              {/* Comment header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium">
                    {(comment.user.name || comment.user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{comment.user.name || comment.user.email}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Content */}
              <p className="text-sm">{comment.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-1.5"
                  disabled={isLoading}
                  onClick={() => handleResolve(comment.id, !comment.resolved)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {comment.resolved ? "Unresolve" : "Resolve"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-1.5"
                  onClick={() => {
                    if (replyingTo === comment.id) {
                      setReplyingTo(null)
                    } else {
                      setReplyingTo(comment.id)
                      setReplyContent("")
                    }
                  }}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                {comment.user.id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-1.5 text-destructive"
                    disabled={isLoading}
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-4 space-y-2 border-l pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{reply.user.name || reply.user.email}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="flex gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    placeholder="Reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="text-xs min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleReply(comment.id)
                      }
                    }}
                  />
                  <Button size="sm" className="h-8 self-end" onClick={() => handleReply(comment.id)}>
                    Send
                  </Button>
                </div>
              )}
            </div>
          )
        })}

        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No comments yet
          </div>
        )}
      </div>

      {/* New comment input */}
      <div className="border-t p-3 space-y-2">
        {pendingComment && (
          <div className="flex items-start gap-2 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
            <div className="flex-1">
              <span className="text-muted-foreground">Commenting on: </span>
              &ldquo;{pendingComment.quotedText.slice(0, 80)}{pendingComment.quotedText.length > 80 ? "..." : ""}&rdquo;
            </div>
            <button type="button" onClick={() => onPendingCommentClear?.()} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <Textarea
          ref={newCommentRef}
          placeholder={pendingComment ? "Add your comment about this selection..." : "Add a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="text-sm min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAddComment()
            }
          }}
        />
        <Button size="sm" className="w-full" onClick={handleAddComment} disabled={!newComment.trim()}>
          Comment
        </Button>
      </div>
    </div>
  )
}
