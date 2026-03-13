// types/index.ts — All TypeScript interfaces for ResearchCollab

export type ProjectStatus = 'draft' | 'active' | 'review' | 'merged' | 'done'
export type MemberRole = 'admin' | 'member'
export type SectionStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved'
export type ContributionAction = 'created' | 'edited' | 'ai_prompted' | 'reviewed' | 'merged'
export type ChatContext = 'workspace' | 'coach' | 'group_chat'
export type ModerationContext = 'group_chat' | 'workspace_chat' | 'section' | 'comment'

export interface User {
  id: string
  email: string
  full_name: string
  affiliation?: string
  avatar_url?: string
  language: string
  created_at: string
}

export interface Project {
  id: string
  title: string
  description: string
  topic: string
  status: ProjectStatus
  admin_id: string
  created_at: string
  admin?: User
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  assigned_subtopic?: string
  section_status: SectionStatus
  joined_at: string
  user?: User
}

export interface Section {
  id: string
  project_id: string
  member_id: string
  subtopic: string
  content: string
  word_count: number
  submitted: boolean
  submitted_at?: string
  updated_at: string
  member?: User
}

export interface ContributorshipLog {
  id: string
  project_id: string
  user_id: string
  action: ContributionAction
  description: string
  timestamp: string
  user?: User
}

export interface ChatMessage {
  id: string
  project_id: string
  user_id?: string | null
  role: 'user' | 'assistant'
  content: string
  context: ChatContext
  messageType?: 'text' | 'research_share' | 'agent_response'
  created_at: string
  user?: User
}

export interface ModerationAlert {
  id: string
  projectId: string
  reportedUserId: string
  adminId: string
  messages: { role: string; content: string; userName: string }[]
  flaggedMsg: string
  reason: string
  severity: 'low' | 'medium' | 'high'
  reviewed: boolean
  createdAt: string
  reporter?: { id: string; full_name: string; avatar_url?: string }
}

export interface DocumentChunk {
  id: string
  projectId: string
  memberId: string
  fileName: string
  fileUrl: string
  chunkIndex: number
  content: string
  createdAt: string
}

export interface ModerationLog {
  id: string
  content: string
  user_id: string
  project_id: string
  context: ModerationContext
  reason: string
  timestamp: string
  user?: User
}

export interface FinalOutput {
  id: string
  project_id: string
  merged_content: string
  methodology_disclosure: string
  bias_audit_report: string
  visual_summary_url?: string
  pdf_url?: string
  generated_at: string
}

export interface LatexDocument {
  id: string
  project_id: string
  format: string
  sections: Record<string, string>
  confirmed_sections: string[]
  generated_at: string
  updated_at: string
}

export interface BiasFlag {
  sentence: string
  issue: string
  suggestion: string
}

export interface BiasAuditResult {
  summary: string
  flags: BiasFlag[]
}

export interface SubtopicAssignment {
  member_id: string
  subtopic: string
  rationale: string
  estimated_word_count: number
}

export interface ModerationResult {
  pass: boolean
  reason?: string
}
