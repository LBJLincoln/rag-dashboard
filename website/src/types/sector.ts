import type { LucideIcon } from 'lucide-react'

export interface VideoScriptRow {
  time: string
  voice: string
  screen: string
}

export interface Sector {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  colorVar: string
  gradient: string
  // Pain point fields (new)
  painPoint?: string
  painPointSub?: string
  roiPrimary?: string
  roiSecondary?: string
  roiThird?: string
  // Video script (new)
  videoScript?: VideoScriptRow[]
  metrics: {
    label: string
    value: string
  }[]
  useCases: UseCase[]
}

export interface UseCase {
  question: string
  label: string
  roi?: string
}
