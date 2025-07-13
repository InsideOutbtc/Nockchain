/**
 * Technical Support System Type Definitions
 */

export interface TechnicalIssue {
  id?: string;
  userId: string;
  title: string;
  description: string;
  category: TechnicalCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  attachments?: AttachmentFile[];
  userAgent?: string;
  systemInfo?: SystemInfo;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  createdAt: Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: TechnicalCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TicketStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
  escalationReason?: string;
  tags: string[];
  interactionHistory?: TicketInteraction[];
  relatedTickets?: string[];
  customerSatisfaction?: number;
  resolutionTime?: number;
}

export interface TechnicalSolution {
  id: string;
  category: TechnicalCategory;
  problem: string;
  solution: string;
  steps: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  successRate: number;
  prerequisites?: string[];
  warnings?: string[];
  relatedSolutions?: string[];
  relevanceScore?: number;
  learnedFrom?: string;
  createdAt?: Date;
  updatedAt?: Date;
  usageCount?: number;
  feedback?: SolutionFeedback[];
}

export interface ResolutionPlan {
  id: string;
  ticketId: string;
  solutionId: string;
  steps: ResolutionStep[];
  estimatedDuration: string;
  complexity: 'low' | 'medium' | 'high';
  successProbability: number;
  resources?: ResourceRequirement[];
  dependencies?: string[];
  rollbackPlan?: string[];
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface ResolutionStep {
  order: number;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  estimatedTime: string;
  actualTime?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
  automatable: boolean;
  requiresHumanInput?: boolean;
  validationCriteria?: string[];
}

export interface TicketInteraction {
  id: string;
  ticketId: string;
  type: 'user-message' | 'agent-response' | 'system-update' | 'escalation' | 'resolution';
  content: string;
  timestamp: Date;
  author: string;
  isAutomated: boolean;
  metadata?: any;
}

export interface SystemInfo {
  operatingSystem: string;
  browser?: string;
  browserVersion?: string;
  nodeVersion?: string;
  walletVersion?: string;
  networkConnection: 'mainnet' | 'testnet' | 'devnet';
  lastSyncTime?: Date;
  errorLogs?: string[];
}

export interface AttachmentFile {
  id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  isScreenshot?: boolean;
  isLogFile?: boolean;
}

export interface ResourceRequirement {
  type: 'documentation' | 'tool' | 'expert' | 'system-access';
  resource: string;
  required: boolean;
  description?: string;
}

export interface SolutionFeedback {
  id: string;
  ticketId: string;
  rating: number; // 1-5 scale
  helpful: boolean;
  comments?: string;
  submittedAt: Date;
  submittedBy: string;
}

export interface TechnicalMetrics {
  totalTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  averageResolutionTime: number;
  firstContactResolution: number;
  customerSatisfactionScore: number;
  categoryBreakdown: Record<TechnicalCategory, number>;
  priorityBreakdown: Record<string, number>;
  resolutionMethods: Record<string, number>;
  topIssues: Array<{
    problem: string;
    count: number;
    averageResolutionTime: number;
  }>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  successRate: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';
  value: string | number;
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'auto-resolve' | 'assign' | 'escalate' | 'tag' | 'notify' | 'update-priority';
  parameters: Record<string, any>;
}

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: TechnicalCategory;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lastUpdated: Date;
  author: string;
  views: number;
  helpful: number;
  notHelpful: number;
  relatedEntries: string[];
  searchKeywords: string[];
}

export interface ExpertConsultation {
  id: string;
  ticketId: string;
  expertType: 'zkpow' | 'bridge' | 'dex' | 'security' | 'performance' | 'general';
  query: string;
  response: string;
  confidence: number;
  timestamp: Date;
  followUpRequired: boolean;
  implementationSteps?: string[];
  risks?: string[];
  recommendations?: string[];
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerConditions: {
    timeThreshold?: number; // minutes
    failedAttempts?: number;
    priority?: string;
    category?: TechnicalCategory;
    keywords?: string[];
  };
  escalationTarget: 'human-support' | 'senior-engineer' | 'security-team' | 'development-team';
  notificationMethod: 'email' | 'slack' | 'sms' | 'webhook';
  enabled: boolean;
  createdAt: Date;
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  resolutionTime: {
    average: number;
    p95: number;
    p99: number;
  };
  automationRate: number;
  escalationRate: number;
  customerSatisfaction: number;
  firstContactResolution: number;
  knowledgeBaseHitRate: number;
}

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'capacity' | 'user-experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedSystems: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  falsePositive?: boolean;
  metadata?: any;
}

export interface UserExperience {
  userId: string;
  sessionId: string;
  touchpoints: TouchPoint[];
  satisfaction: number;
  completedTasks: number;
  failedTasks: number;
  totalTime: number;
  issuesEncountered: string[];
  feedback?: string;
  timestamp: Date;
}

export interface TouchPoint {
  type: 'page-load' | 'form-submission' | 'api-call' | 'error' | 'success';
  timestamp: Date;
  duration: number;
  success: boolean;
  details?: any;
}

export type TechnicalCategory = 
  | 'Mining Pool'
  | 'zkPoW'
  | 'Bridge'
  | 'DeFi'
  | 'Wallet'
  | 'API'
  | 'Network'
  | 'Security'
  | 'Performance'
  | 'Integration'
  | 'Mobile'
  | 'Web Interface'
  | 'Documentation'
  | 'General';

export type TicketStatus = 
  | 'open'
  | 'in-progress'
  | 'pending-user'
  | 'pending-internal'
  | 'resolved'
  | 'closed'
  | 'escalated'
  | 'duplicate'
  | 'invalid';

export type ResolutionMethod = 
  | 'knowledge-base'
  | 'automated-script'
  | 'expert-consultation'
  | 'manual-intervention'
  | 'escalation'
  | 'user-education'
  | 'system-update';

export type CommunicationChannel = 
  | 'email'
  | 'chat'
  | 'phone'
  | 'video'
  | 'ticket-system'
  | 'knowledge-base'
  | 'community-forum';

export interface AgentCoordination {
  targetAgent: string;
  coordinationType: 'handoff' | 'consultation' | 'collaboration' | 'escalation';
  context: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedResponse: string;
  timeout: number;
}

export interface QualityAssurance {
  ticketId: string;
  reviewerId: string;
  resolutionAccuracy: number;
  customerSatisfaction: number;
  communicationQuality: number;
  technicalProficiency: number;
  responseTime: number;
  overallScore: number;
  feedback: string;
  improvementSuggestions: string[];
  reviewDate: Date;
}

export interface ProactiveIntervention {
  id: string;
  type: 'system-alert' | 'user-behavior' | 'performance-degradation' | 'security-threat';
  trigger: string;
  description: string;
  automaticActions: string[];
  userNotification: boolean;
  preventedIssues: string[];
  confidence: number;
  timestamp: Date;
}

export interface LearningData {
  ticketId: string;
  userInteraction: string;
  resolutionMethod: ResolutionMethod;
  outcome: 'success' | 'failure' | 'partial';
  timeTaken: number;
  userSatisfaction: number;
  lessonsLearned: string[];
  knowledgeBaseUpdates: string[];
  processImprovements: string[];
}

export interface ContinuousImprovement {
  id: string;
  type: 'process' | 'knowledge' | 'automation' | 'training';
  suggestion: string;
  rationale: string;
  expectedImpact: string;
  implementationCost: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'suggested' | 'reviewed' | 'approved' | 'implemented' | 'rejected';
  submittedBy: string;
  submittedAt: Date;
}