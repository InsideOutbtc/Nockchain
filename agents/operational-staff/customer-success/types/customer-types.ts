/**
 * CUSTOMER SUCCESS TYPE DEFINITIONS
 * Complete type system for Jennifer Williams Customer Success operations
 */

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  industry: string;
  accountType: 'individual' | 'business' | 'enterprise';
  technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  businessType: 'defi' | 'mining' | 'trading' | 'development' | 'enterprise' | 'other';
  geographicRegion: 'north_america' | 'europe' | 'asia_pacific' | 'other';
  signupDate: number;
  goals: string[];
  challenges: string[];
  successCriteria: string[];
  preferredCommunication: 'email' | 'phone' | 'chat' | 'video';
  timezone: string;
  healthScore: number;
  lastHealthUpdate: number;
  relationshipStage: 'onboarding' | 'active' | 'expansion' | 'renewal' | 'at_risk' | 'churned';
  lifetimeValue: number;
  contractValue: number;
  renewalDate?: number;
  customFields: Record<string, any>;
}

export interface CustomerHealth {
  customerId: string;
  overallScore: number;
  lastCalculated: number;
  scoreHistory: HealthScoreHistory[];
  metrics: {
    usage: UsageMetrics;
    engagement: EngagementMetrics;
    satisfaction: SatisfactionMetrics;
    financial: FinancialMetrics;
    support: SupportMetrics;
  };
  riskFactors: RiskFactor[];
  trends: HealthTrends;
  predictions: HealthPredictions;
}

export interface HealthScoreHistory {
  timestamp: number;
  score: number;
  factors: string[];
  notes?: string;
}

export interface UsageMetrics {
  loginFrequency: number;
  sessionDuration: number;
  featureUsage: Record<string, number>;
  transactionVolume: number;
  transactionFrequency: number;
  apiCalls: number;
  lastActivity: number;
}

export interface EngagementMetrics {
  emailOpenRate: number;
  responseRate: number;
  communityParticipation: number;
  documentationUsage: number;
  supportInteractions: number;
  proactiveOutreach: number;
}

export interface SatisfactionMetrics {
  surveyScores: number[];
  feedbackSentiment: number;
  npsScore: number;
  referralWillingness: number;
  testimonialProvided: boolean;
}

export interface FinancialMetrics {
  paymentHistory: PaymentRecord[];
  planUtilization: number;
  expansionIndicators: number;
  billingIssues: number;
  revenueGrowth: number;
}

export interface SupportMetrics {
  ticketCount: number;
  averageResolutionTime: number;
  satisfactionScore: number;
  escalationRate: number;
  selfServiceSuccess: number;
}

export interface PaymentRecord {
  date: number;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  method: string;
}

export interface RiskFactor {
  type: 'usage_decline' | 'payment_issues' | 'support_problems' | 'engagement_drop' | 'satisfaction_decline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface HealthTrends {
  overall: TrendDirection;
  usage: TrendDirection;
  engagement: TrendDirection;
  satisfaction: TrendDirection;
  periodComparison: {
    current: number;
    previous: number;
    change: number;
    percentage: number;
  };
}

export interface HealthPredictions {
  churnProbability: number;
  expansionProbability: number;
  satisfactionTrend: TrendDirection;
  recommendedActions: string[];
  confidenceLevel: number;
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'critical';

export interface InteractionRecord {
  id: string;
  customerId: string;
  type: 'email' | 'phone' | 'chat' | 'meeting' | 'support' | 'proactive_outreach';
  direction: 'inbound' | 'outbound';
  timestamp: number;
  agent: string;
  channel: string;
  subject?: string;
  content?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  outcome?: string;
  nextAction?: string;
  tags: string[];
  metadata: Record<string, any>;
  duration?: number;
  attachments?: string[];
}

export interface TechnicalIssue {
  id: string;
  customerId: string;
  type: 'integration' | 'performance' | 'security' | 'compliance' | 'feature' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  errorMessages: string[];
  affectedSystems: string[];
  userContext: string;
  reportedAt: number;
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
  assignedAgent?: string;
  resolutionNotes?: string;
  resolvedAt?: number;
}

export interface CustomerInquiry {
  id: string;
  customerId: string;
  type: 'product_question' | 'technical_support' | 'billing' | 'feature_request' | 'feedback' | 'complaint';
  question: string;
  context: string;
  customerGoals: string[];
  technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  receivedAt: number;
  status: 'new' | 'processing' | 'responded' | 'closed';
  assignedAgent?: string;
  response?: string;
  respondedAt?: number;
  satisfactionScore?: number;
}

export interface ExpertGuidance {
  id: string;
  query: any;
  response: string;
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  timestamp: number;
  sources: string[];
  recommendations: string[];
  technicalAccuracy: boolean;
  complianceValidated: boolean;
  customerContext?: {
    customerId: string;
    profile: CustomerProfile;
    previousInteractions: InteractionRecord[];
  };
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'onboarding' | 'health_monitoring' | 'retention' | 'expansion' | 'support';
  triggers: string[];
  conditions: WorkflowCondition[];
  steps: WorkflowStep[];
  success_criteria: string[];
  failure_conditions: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: 'email' | 'call' | 'meeting' | 'task' | 'notification' | 'escalation';
  delay: number;
  template?: string;
  personalizations?: string[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  timeout?: number;
  retries?: number;
}

export interface WorkflowAction {
  type: string;
  parameters: Record<string, any>;
  conditions?: WorkflowCondition[];
}

export interface OutreachCampaign {
  id: string;
  name: string;
  type: 'onboarding' | 'engagement' | 'retention' | 'expansion' | 'reactivation';
  targetCriteria: CustomerCriteria;
  sequence: OutreachStep[];
  timing: CampaignTiming;
  personalization: PersonalizationRules;
  success_metrics: string[];
  active: boolean;
  createdAt: number;
  performance: CampaignPerformance;
}

export interface CustomerCriteria {
  healthScore?: { min?: number; max?: number };
  accountType?: ('individual' | 'business' | 'enterprise')[];
  technicalLevel?: ('beginner' | 'intermediate' | 'advanced' | 'expert')[];
  relationshipStage?: ('onboarding' | 'active' | 'expansion' | 'renewal' | 'at_risk')[];
  lastActivity?: { days: number; operator: 'greater_than' | 'less_than' };
  customFields?: Record<string, any>;
}

export interface OutreachStep {
  id: string;
  order: number;
  type: 'email' | 'phone' | 'chat' | 'meeting_request';
  delay: number;
  template: string;
  personalizations: string[];
  conditions?: WorkflowCondition[];
  followUpActions?: string[];
}

export interface CampaignTiming {
  startDate?: number;
  endDate?: number;
  timeZoneHandling: 'customer' | 'agent' | 'utc';
  respectBusinessHours: boolean;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
}

export interface PersonalizationRules {
  dynamicContent: Record<string, string>;
  conditionalSections: ConditionalSection[];
  customVariables: Record<string, any>;
  localization: LocalizationRules;
}

export interface ConditionalSection {
  condition: WorkflowCondition;
  content: string;
  alternativeContent?: string;
}

export interface LocalizationRules {
  defaultLanguage: string;
  supportedLanguages: string[];
  autoDetect: boolean;
  fallbackBehavior: 'default' | 'skip' | 'translate';
}

export interface CampaignPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  converted: number;
  unsubscribed: number;
  bounced: number;
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
    unsubscribeRate: number;
  };
}

export interface SuccessPlaybook {
  id: string;
  name: string;
  description: string;
  applicableTo: CustomerCriteria;
  stages: PlaybookStage[];
  kpis: PlaybookKPI[];
  resources: PlaybookResource[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlaybookStage {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  objectives: string[];
  activities: PlaybookActivity[];
  success_criteria: string[];
  exit_criteria: string[];
}

export interface PlaybookActivity {
  id: string;
  name: string;
  type: 'outreach' | 'meeting' | 'training' | 'resource_sharing' | 'milestone_check';
  description: string;
  timing: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  resources: string[];
  outcomes: string[];
}

export interface PlaybookKPI {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  trend: TrendDirection;
  calculationMethod: string;
}

export interface PlaybookResource {
  id: string;
  name: string;
  type: 'document' | 'video' | 'template' | 'tool' | 'training';
  url: string;
  description: string;
  applicableStages: string[];
  tags: string[];
}

export interface SuccessMetrics {
  customerId: string;
  period: {
    start: number;
    end: number;
  };
  metrics: {
    healthScore: MetricValue;
    satisfaction: MetricValue;
    engagement: MetricValue;
    adoption: MetricValue;
    retention: MetricValue;
    expansion: MetricValue;
  };
  milestones: Milestone[];
  achievements: Achievement[];
  trends: MetricTrends;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  percentage: number;
  trend: TrendDirection;
  target?: number;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  type: 'onboarding' | 'adoption' | 'engagement' | 'growth' | 'retention';
  achievedAt: number;
  value: number;
  impact: string;
  celebrationSent: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'usage' | 'engagement' | 'growth' | 'advocacy' | 'loyalty';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  achievedAt: number;
  recognitionSent: boolean;
  badge?: string;
}

export interface MetricTrends {
  overall: TrendDirection;
  healthScore: TrendDirection;
  satisfaction: TrendDirection;
  engagement: TrendDirection;
  adoption: TrendDirection;
  retention: TrendDirection;
  expansion: TrendDirection;
  predictions: {
    nextPeriod: number;
    confidence: number;
    factors: string[];
  };
}

export interface EscalationRequest {
  id: string;
  customerId: string;
  type: 'technical' | 'billing' | 'retention' | 'expansion' | 'complaint';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  description: string;
  requestedBy: string;
  requestedAt: number;
  escalatedTo?: string;
  escalatedAt?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
  resolution?: string;
  resolvedAt?: number;
  customerNotified: boolean;
  followUpRequired: boolean;
}

export interface CustomerJourney {
  customerId: string;
  stages: JourneyStage[];
  currentStage: string;
  nextMilestone: string;
  timeInCurrentStage: number;
  totalJourneyTime: number;
  touchpoints: Touchpoint[];
  sentiment: JourneySentiment;
  predictions: JourneyPredictions;
}

export interface JourneyStage {
  id: string;
  name: string;
  description: string;
  enteredAt: number;
  exitedAt?: number;
  duration?: number;
  objectives: string[];
  completed: boolean;
  success_rate: number;
  typical_duration: number;
}

export interface Touchpoint {
  id: string;
  type: 'email' | 'phone' | 'chat' | 'meeting' | 'support' | 'marketing';
  timestamp: number;
  agent: string;
  channel: string;
  purpose: string;
  outcome: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  effectiveness: number;
  nextAction?: string;
}

export interface JourneySentiment {
  overall: 'positive' | 'neutral' | 'negative';
  trend: TrendDirection;
  factors: string[];
  recentChanges: SentimentChange[];
}

export interface SentimentChange {
  timestamp: number;
  previous: 'positive' | 'neutral' | 'negative';
  current: 'positive' | 'neutral' | 'negative';
  trigger: string;
  impact: number;
}

export interface JourneyPredictions {
  nextStage: string;
  timeToNextStage: number;
  churnRisk: number;
  expansionProbability: number;
  satisfactionTrend: TrendDirection;
  interventionsNeeded: string[];
  confidence: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: CustomerCriteria;
  characteristics: string[];
  strategies: SegmentStrategy[];
  performance: SegmentPerformance;
  customerCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface SegmentStrategy {
  id: string;
  name: string;
  description: string;
  type: 'onboarding' | 'retention' | 'expansion' | 'reactivation';
  tactics: string[];
  resources: string[];
  success_metrics: string[];
  active: boolean;
}

export interface SegmentPerformance {
  healthScore: number;
  satisfaction: number;
  retention: number;
  expansion: number;
  churnRate: number;
  lifetimeValue: number;
  trends: {
    healthScore: TrendDirection;
    satisfaction: TrendDirection;
    retention: TrendDirection;
    expansion: TrendDirection;
  };
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  type: 'survey' | 'interview' | 'review' | 'support_feedback' | 'spontaneous';
  source: string;
  timestamp: number;
  rating?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  categories: string[];
  content: string;
  themes: string[];
  actionItems: string[];
  responded: boolean;
  responseAt?: number;
  publiclyVisible: boolean;
}

export interface CustomerPortfolio {
  agentId: string;
  totalCustomers: number;
  segmentation: {
    byHealthScore: Record<string, number>;
    byAccountType: Record<string, number>;
    byStage: Record<string, number>;
    byRisk: Record<string, number>;
  };
  performance: {
    averageHealthScore: number;
    satisfactionScore: number;
    retentionRate: number;
    expansionRate: number;
    churnRate: number;
  };
  workload: {
    activeInterventions: number;
    scheduledTasks: number;
    escalations: number;
    meetingsToday: number;
  };
  trends: {
    healthScore: TrendDirection;
    satisfaction: TrendDirection;
    retention: TrendDirection;
    expansion: TrendDirection;
  };
}

export interface AgentPerformance {
  agentId: string;
  period: {
    start: number;
    end: number;
  };
  metrics: {
    customerSatisfaction: number;
    responseTime: number;
    resolutionRate: number;
    retentionRate: number;
    expansionRate: number;
    healthScoreImprovement: number;
  };
  activities: {
    totalInteractions: number;
    proactiveOutreach: number;
    escalationsHandled: number;
    milestonesAchieved: number;
  };
  customerFeedback: {
    averageRating: number;
    positiveComments: number;
    improvementSuggestions: number;
  };
  goals: {
    current: AgentGoal[];
    achieved: AgentGoal[];
    inProgress: AgentGoal[];
  };
}

export interface AgentGoal {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'achieved' | 'overdue';
  actions: string[];
}

export interface CustomerInsight {
  id: string;
  customerId: string;
  type: 'behavioral' | 'preference' | 'technical' | 'business' | 'predictive';
  insight: string;
  confidence: number;
  source: string;
  generatedAt: number;
  validated: boolean;
  actionable: boolean;
  recommendedActions: string[];
  impact: 'low' | 'medium' | 'high';
  category: string;
  tags: string[];
  expiresAt?: number;
}

export interface CommunicationPreference {
  customerId: string;
  channels: {
    email: ChannelPreference;
    phone: ChannelPreference;
    chat: ChannelPreference;
    video: ChannelPreference;
    sms: ChannelPreference;
  };
  timing: {
    timezone: string;
    businessHours: TimeRange;
    preferredDays: string[];
    blackoutPeriods: TimeRange[];
  };
  frequency: {
    marketing: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'never';
    updates: 'immediate' | 'daily' | 'weekly' | 'monthly';
    support: 'immediate' | 'within_hours' | 'within_day' | 'whenever';
  };
  contentPreferences: {
    technical_level: 'basic' | 'intermediate' | 'advanced' | 'expert';
    format: 'text' | 'video' | 'audio' | 'interactive';
    length: 'brief' | 'detailed' | 'comprehensive';
  };
}

export interface ChannelPreference {
  enabled: boolean;
  priority: number;
  purposes: string[];
  restrictions: string[];
}

export interface TimeRange {
  start: string;
  end: string;
  timezone: string;
}

export interface CustomerEvent {
  id: string;
  customerId: string;
  type: 'signup' | 'login' | 'transaction' | 'feature_usage' | 'support_request' | 'feedback' | 'milestone' | 'churn';
  timestamp: number;
  data: Record<string, any>;
  source: string;
  processed: boolean;
  triggeredActions: string[];
  impact: 'positive' | 'neutral' | 'negative';
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface CustomerContext {
  customerId: string;
  currentSituation: string;
  recentEvents: CustomerEvent[];
  activeIssues: TechnicalIssue[];
  opportunities: Opportunity[];
  risks: Risk[];
  relationships: CustomerRelationship[];
  preferences: CommunicationPreference;
  history: InteractionRecord[];
  insights: CustomerInsight[];
}

export interface Opportunity {
  id: string;
  type: 'expansion' | 'referral' | 'case_study' | 'partnership' | 'advocacy';
  description: string;
  value: number;
  probability: number;
  timeline: number;
  requirements: string[];
  nextSteps: string[];
  assignedTo: string;
  status: 'identified' | 'qualified' | 'pursuing' | 'closed_won' | 'closed_lost';
}

export interface Risk {
  id: string;
  type: 'churn' | 'downgrade' | 'dissatisfaction' | 'competitive' | 'technical';
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
  timeline: number;
  status: 'identified' | 'monitoring' | 'mitigating' | 'resolved';
  assignedTo: string;
}

export interface CustomerRelationship {
  customerId: string;
  contactId: string;
  type: 'primary' | 'secondary' | 'technical' | 'executive' | 'billing';
  influence: 'low' | 'medium' | 'high';
  engagement: 'low' | 'medium' | 'high';
  satisfaction: number;
  lastContact: number;
  preferredChannel: string;
  notes: string;
}

export interface ContentRecommendation {
  id: string;
  customerId: string;
  type: 'article' | 'video' | 'webinar' | 'case_study' | 'tutorial' | 'best_practice';
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  personalizedReason: string;
  recommendedAt: number;
  deliveredAt?: number;
  consumedAt?: number;
  rating?: number;
  feedback?: string;
  nextRecommendations: string[];
}

export interface TaskAutomation {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'triggered' | 'conditional';
  trigger: TaskTrigger;
  actions: TaskAction[];
  conditions: TaskCondition[];
  schedule?: TaskSchedule;
  priority: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  createdAt: number;
  lastExecuted?: number;
  nextExecution?: number;
  executionHistory: TaskExecution[];
}

export interface TaskTrigger {
  type: 'time' | 'event' | 'condition' | 'manual';
  parameters: Record<string, any>;
  conditions: TaskCondition[];
}

export interface TaskAction {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'notification' | 'update' | 'escalation';
  parameters: Record<string, any>;
  order: number;
  conditions?: TaskCondition[];
  retryPolicy?: RetryPolicy;
}

export interface TaskCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface TaskSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  interval?: number;
  days?: string[];
  time?: string;
  timezone?: string;
  startDate?: number;
  endDate?: number;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  executedBy: string;
  logs: string[];
}

export interface RetryPolicy {
  maxRetries: number;
  retryInterval: number;
  backoffMultiplier: number;
  maxInterval: number;
  retryConditions: string[];
}

export interface CustomerSuccessConfiguration {
  agentId: string;
  persona: {
    name: string;
    role: string;
    personality: Record<string, any>;
    communication: Record<string, any>;
    expertise: string[];
  };
  workflows: {
    onboarding: string[];
    health_monitoring: string[];
    retention: string[];
    expansion: string[];
  };
  thresholds: {
    health_score: {
      healthy: number;
      stable: number;
      at_risk: number;
      critical: number;
    };
    response_time: {
      target: number;
      maximum: number;
    };
    satisfaction: {
      target: number;
      minimum: number;
    };
  };
  automation: {
    level: 'low' | 'medium' | 'high' | 'maximum';
    human_intervention: string[];
    approval_required: string[];
  };
  integration: {
    expert_prompt_agent: boolean;
    technical_support: boolean;
    billing_system: boolean;
    community_management: boolean;
  };
}

export interface CustomerSuccessReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period: {
    start: number;
    end: number;
  };
  generatedAt: number;
  generatedBy: string;
  summary: {
    totalCustomers: number;
    healthScoreAverage: number;
    satisfactionAverage: number;
    retentionRate: number;
    expansionRate: number;
    churnRate: number;
  };
  metrics: {
    health: HealthMetricsReport;
    satisfaction: SatisfactionMetricsReport;
    engagement: EngagementMetricsReport;
    retention: RetentionMetricsReport;
    expansion: ExpansionMetricsReport;
  };
  insights: ReportInsight[];
  recommendations: ReportRecommendation[];
  trends: ReportTrend[];
}

export interface HealthMetricsReport {
  distribution: Record<string, number>;
  trends: Record<string, number>;
  improvements: number;
  declines: number;
  interventions: number;
  success_rate: number;
}

export interface SatisfactionMetricsReport {
  average: number;
  distribution: Record<string, number>;
  trends: Record<string, number>;
  nps: number;
  feedback_volume: number;
  response_rate: number;
}

export interface EngagementMetricsReport {
  activity_levels: Record<string, number>;
  feature_adoption: Record<string, number>;
  communication_effectiveness: Record<string, number>;
  community_participation: number;
}

export interface RetentionMetricsReport {
  overall_rate: number;
  by_segment: Record<string, number>;
  churn_reasons: Record<string, number>;
  at_risk_customers: number;
  interventions: number;
  success_rate: number;
}

export interface ExpansionMetricsReport {
  revenue_growth: number;
  account_expansion: number;
  upsell_rate: number;
  cross_sell_rate: number;
  opportunities: number;
  conversion_rate: number;
}

export interface ReportInsight {
  id: string;
  type: 'observation' | 'trend' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data: Record<string, any>;
  actions: string[];
}

export interface ReportRecommendation {
  id: string;
  type: 'process' | 'strategy' | 'resource' | 'automation' | 'training';
  title: string;
  description: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: number;
  owner: string;
  resources: string[];
}

export interface ReportTrend {
  id: string;
  metric: string;
  direction: TrendDirection;
  magnitude: number;
  duration: number;
  significance: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  predictions: {
    next_period: number;
    confidence: number;
    factors: string[];
  };
}