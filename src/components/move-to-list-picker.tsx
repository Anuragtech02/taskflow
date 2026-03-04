"use client"

import * as React from "react"
import { Check, FolderOpen, List } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useWorkspaceLists } from "@/hooks/useQueries"

interface MoveToListPickerProps {
  workspaceId: string
  currentListId?: string
  onSelect: (listId: string) => void
  trigger: React.ReactNode
  align?: "start" | "center" | "end"
}

export function MoveToListPicker({
  workspaceId,
  currentListId,
  onSelect,
  trigger,
  align = "start",
}: MoveToListPickerProps) {
  const [open, setOpen] = React.useState(false)
  const { data: spaces = [] } = useWorkspaceLists(workspaceId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align={align}>
        <Command>
          <CommandInput placeholder="Search lists..." />
          <CommandList>
            <CommandEmpty>No lists found.</CommandEmpty>
            {spaces.map((space) => {
              const hasDirectLists = space.lists.length > 0
              const hasFolders = space.folders.length > 0

              if (!hasDirectLists && !hasFolders) return null

              return (
                <React.Fragment key={space.id}>
                  {/* Direct lists under the space */}
                  {hasDirectLists && (
                    <CommandGroup heading={space.name}>
                      {space.lists.map((list) => (
                        <CommandItem
                          key={list.id}
                          value={`${space.name} ${list.name}`}
                          disabled={list.id === currentListId}
                          onSelect={() => {
                            onSelect(list.id)
                            setOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <List className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{list.name}</span>
                          {list.id === currentListId && (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Lists inside folders */}
                  {space.folders.map((folder) => {
                    if (folder.lists.length === 0) return null
                    return (
                      <CommandGroup
                        key={folder.id}
                        heading={
                          <span className="flex items-center gap-1">
                            <span>{space.name}</span>
                            <span className="text-muted-foreground">/</span>
                            <FolderOpen className="h-3 w-3" />
                            <span>{folder.name}</span>
                          </span>
                        }
                      >
                        {folder.lists.map((list) => (
                          <CommandItem
                            key={list.id}
                            value={`${space.name} ${folder.name} ${list.name}`}
                            disabled={list.id === currentListId}
                            onSelect={() => {
                              onSelect(list.id)
                              setOpen(false)
                            }}
                            className="flex items-center gap-2"
                          >
                            <List className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate">{list.name}</span>
                            {list.id === currentListId && (
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
