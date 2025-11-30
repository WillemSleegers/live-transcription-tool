"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X } from "lucide-react"
import type { Speaker } from "@/lib/types"
import { getSpeakerColor } from "@/lib/constants"

interface SpeakerManagementProps {
  speakers: Speaker[]
  onAddSpeaker: (name: string) => void
  onRemoveSpeaker: (id: number) => void
  onRenameSpeaker: (id: number, name: string) => void
}

export function SpeakerManagement({
  speakers,
  onAddSpeaker,
  onRemoveSpeaker,
  onRenameSpeaker,
}: SpeakerManagementProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newSpeakerName, setNewSpeakerName] = useState("")

  const handleAddSpeaker = () => {
    if (newSpeakerName.trim()) {
      onAddSpeaker(newSpeakerName.trim())
      setNewSpeakerName("")
      setIsAddingNew(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprekers</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          className="h-7 px-2"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        {speakers.map((speaker) => (
          <div
            key={speaker.id}
            className="group flex items-center gap-2 p-2 rounded-lg border"
          >
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: speaker.color }}
            />
            <Input
              type="text"
              value={speaker.name}
              onChange={(e) => {
                e.stopPropagation()
                onRenameSpeaker(speaker.id, e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent border-0 shadow-none px-0 h-auto focus-visible:ring-0"
            />
            <div className="w-6 h-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveSpeaker(speaker.id)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {isAddingNew && (
          <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: getSpeakerColor(speakers.length),
              }}
            />
            <Input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSpeaker()
                } else if (e.key === "Escape") {
                  setIsAddingNew(false)
                  setNewSpeakerName("")
                }
              }}
              onBlur={() => {
                if (newSpeakerName.trim()) {
                  handleAddSpeaker()
                } else {
                  setIsAddingNew(false)
                }
              }}
              placeholder="Naam spreker..."
              className="flex-1 bg-transparent border-0 shadow-none px-0 h-auto focus-visible:ring-0"
              autoFocus
            />
          </div>
        )}
      </div>

      {speakers.length === 0 && !isAddingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nog geen sprekers toegevoegd
        </p>
      )}
    </div>
  )
}
