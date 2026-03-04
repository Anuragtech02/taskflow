"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { User, Lock, Building2, Loader2, LogOut, Palette, Key, Plus, Trash2, Copy, Check } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useWorkspaces, useUpdateUser, useUpdateUserPassword, useUpdateWorkspace, useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/useSettings"
import { toast } from "sonner"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  
  // Profile state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Workspace state
  const [workspaceName, setWorkspaceName] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // API Keys state
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces()
  const { data: apiKeys, isLoading: apiKeysLoading } = useApiKeys()
  const createApiKeyMutation = useCreateApiKey()
  const deleteApiKeyMutation = useDeleteApiKey()
  const updateUserMutation = useUpdateUser()
  const updatePasswordMutation = useUpdateUserPassword()
  const updateWorkspaceMutation = useUpdateWorkspace()

  // Initialize user data from session
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setEmail(session.user.email || "")
      setAvatarUrl(session.user.image || "")
    }
  }, [session])

  // Initialize workspace data
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id)
      setWorkspaceName(workspaces[0].name)
    }
  }, [workspaces, selectedWorkspaceId])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await updateUserMutation.mutateAsync({
        name,
        avatarUrl: avatarUrl || undefined,
      })
      
      // Update session with new data
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name,
          image: avatarUrl,
        },
      })
      
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    
    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      toast.success("Password changed successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password")
    }
  }

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedWorkspaceId) return
    
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: selectedWorkspaceId,
        name: workspaceName,
      })
      
      toast.success("Workspace updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update workspace")
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" })
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return

    try {
      const result = await createApiKeyMutation.mutateAsync({ name: newKeyName.trim() })
      setCreatedKey(result.apiKey.key)
      setNewKeyName("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key")
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      await deleteApiKeyMutation.mutateAsync(keyId)
      toast.success("API key deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete API key")
    }
  }

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    toast.success("API key copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseCreateDialog = () => {
    setCreateKeyDialogOpen(false)
    setCreatedKey(null)
    setNewKeyName("")
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))

    if (diffMs < 0) {
      // Future date
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Tomorrow"
      if (diffDays < 30) return `in ${diffDays}d`
      if (diffDays < 365) return `in ${Math.floor(diffDays / 30)}mo`
      return `in ${Math.floor(diffDays / 365)}y`
    }

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const isAdmin = true // TODO: Check actual role

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and workspace settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Lock className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-2">
            <Building2 className="h-4 w-4" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="text-xl">
                      {name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to an image, or leave empty for default
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Customize the look and feel of your TaskFlow interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSwitcher />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updatePasswordMutation.isPending}>
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage API keys for MCP server and external integrations
                  </CardDescription>
                </div>
                <Dialog open={createKeyDialogOpen} onOpenChange={(open) => {
                  if (!open) handleCloseCreateDialog()
                  else setCreateKeyDialogOpen(true)
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    {createdKey ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>API Key Created</DialogTitle>
                          <DialogDescription>
                            Copy your API key now. You won&apos;t be able to see it again.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-muted p-3 text-sm font-mono break-all">
                              {createdKey}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopyKey(createdKey)}
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-destructive font-medium">
                            This key won&apos;t be shown again. Store it securely.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCloseCreateDialog}>Done</Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle>Create API Key</DialogTitle>
                          <DialogDescription>
                            Give your API key a descriptive name to remember what it&apos;s used for.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="keyName">Key Name</Label>
                            <Input
                              id="keyName"
                              placeholder="e.g. MCP Server, CI/CD Pipeline"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleCreateApiKey()
                                }
                              }}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={handleCloseCreateDialog}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateApiKey}
                            disabled={!newKeyName.trim() || createApiKeyMutation.isPending}
                          >
                            {createApiKeyMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              "Generate Key"
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => {
                      const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
                      return (
                        <TableRow key={apiKey.id}>
                          <TableCell className="font-medium">{apiKey.name}</TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                              {apiKey.keyPrefix}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatRelativeDate(apiKey.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {apiKey.lastUsedAt ? formatRelativeDate(apiKey.lastUsedAt) : "Never"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {apiKey.expiresAt ? formatRelativeDate(apiKey.expiresAt) : "No expiry"}
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{apiKey.name}&quot;? Any integrations using this key will stop working immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteApiKey(apiKey.id)}
                                    disabled={deleteApiKeyMutation.isPending}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteApiKeyMutation.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No API keys</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an API key to connect external tools and MCP integrations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>
                Manage your workspace name and members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspacesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : workspaces && workspaces.length > 0 ? (
                <form onSubmit={handleWorkspaceSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name</Label>
                    <Input
                      id="workspaceName"
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateWorkspaceMutation.isPending}>
                      {updateWorkspaceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-muted-foreground">No workspace found</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Workspace Members</CardTitle>
              <CardDescription>
                People who have access to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Member management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t">
        <Button 
          variant="outline" 
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
