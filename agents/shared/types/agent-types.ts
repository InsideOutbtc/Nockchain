// NOCK Bridge Agent System Types
// Shared type definitions for the agent coordination system

export interface AgentConfig {
  enabled: boolean;
  workspace: string;
  schedule: string;
  priority: 'low' | 'medium' | 'high';
  tasks: string[];
  capabilities: string[];
  resources: {
    max_memory: string;
    max_cpu: string;
    timeout: string;
  };
}

export interface AgentTask {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  parameters?: Record<string, any>;
  dependencies?: string[];
  scheduled_for?: number;
  created_at: number;
  agent_id?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentMessage {
  id: string;
  type: 'task_result' | 'data_update' | 'coordination' | 'alert' | 'request' | 'market_intelligence_update' | 'user_insights_update' | 'product_roadmap_update' | 'resource_notification' | 'delivery_confirmation';
  content: Record<string, any>;
  from?: string;
  to?: string;
  timestamp: number;
  processed?: boolean;
}

export interface AgentStatus {
  id: string;
  status: 'initialized' | 'active' | 'inactive' | 'stopped' | 'error';
  last_active: number;
  task_count: number;
  success_rate: number;
  config: AgentConfig;
  current_task?: string;
  error_message?: string;
}

export interface WorkspaceConfig {
  agent_id: string;
  workspace_path: string;
  temp_directory: string;
  cache_directory: string;
  log_directory: string;
  max_storage: string;
  cleanup_interval: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  agent_type: 'marketing' | 'research' | 'feature_planning';
  template: {
    type: string;
    default_priority: 'low' | 'medium' | 'high' | 'critical';
    estimated_duration: string;
    required_parameters: string[];
    optional_parameters: string[];
  };
}

export interface AgentOutput {
  task_id: string;
  agent_id: string;
  output_type: 'report' | 'analysis' | 'plan' | 'content' | 'data';
  content: any;
  format: 'json' | 'markdown' | 'html' | 'csv' | 'pdf';
  metadata: {
    created_at: number;
    version: string;
    quality_score?: number;
    confidence?: number;
  };
  tags: string[];
}

export interface AgentCommunication {
  message_id: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  payload: Record<string, any>;
  timestamp: number;
  status: 'sent' | 'delivered' | 'processed' | 'failed' | 'received';
}

export interface SharedResource {
  id: string;
  type: 'data' | 'template' | 'configuration' | 'model' | 'cache';
  name: string;
  content: any;
  owner_agent?: string;
  access_permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
  created_at: number;
  updated_at: number;
  version: string;
}

export interface AgentPerformanceMetrics {
  agent_id: string;
  period: {
    start: number;
    end: number;
  };
  metrics: {
    tasks_completed: number;
    tasks_failed: number;
    success_rate: number;
    average_execution_time: number;
    resource_utilization: {
      cpu_average: number;
      memory_average: number;
      storage_used: number;
    };
    quality_scores: number[];
    collaboration_score: number;
  };
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  title: string;
  description: string;
  timestamp: number;
  resolved: boolean;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface AgentSchedule {
  agent_id: string;
  schedule_type: 'cron' | 'interval' | 'manual';
  schedule_expression: string;
  timezone: string;
  enabled: boolean;
  next_execution: number;
  last_execution?: number;
  task_template: TaskTemplate;
}

export interface CollaborationRequest {
  id: string;
  requesting_agent: string;
  target_agent: string;
  collaboration_type: 'data_request' | 'task_assistance' | 'resource_sharing' | 'coordination';
  description: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  created_at: number;
  response?: any;
}

export interface AgentWorkspace {
  agent_id: string;
  workspace_path: string;
  directories: {
    input: string;
    output: string;
    temp: string;
    cache: string;
    logs: string;
    templates: string;
  };
  configuration: Record<string, any>;
  active_tasks: string[];
  storage_quota: {
    total: number;
    used: number;
    available: number;
  };
  last_cleanup: number;
}

export interface TaskResult {
  task_id: string;
  agent_id: string;
  status: 'success' | 'failure' | 'partial';
  output: any;
  metadata: {
    execution_time: number;
    resource_usage: {
      cpu_time: number;
      memory_peak: number;
      storage_used: number;
    };
    quality_metrics?: {
      accuracy?: number;
      completeness?: number;
      timeliness?: number;
      relevance?: number;
    };
  };
  error_details?: {
    error_type: string;
    error_message: string;
    stack_trace?: string;
    recovery_suggestions?: string[];
  };
  created_at: number;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  agent_types: ('marketing' | 'research' | 'feature_planning')[];
  input_types: string[];
  output_types: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  estimated_time: string;
  resource_requirements: {
    cpu: string;
    memory: string;
    storage: string;
  };
  dependencies: string[];
}

export interface CoordinationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event_type: string;
    conditions: Record<string, any>;
  };
  actions: {
    type: string;
    parameters: Record<string, any>;
    target_agents?: string[];
  }[];
  priority: number;
  enabled: boolean;
  created_at: number;
  last_triggered?: number;
  trigger_count: number;
}

export interface AgentHealth {
  agent_id: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  last_heartbeat: number;
  response_time: number;
  resource_usage: {
    cpu_percent: number;
    memory_percent: number;
    storage_percent: number;
  };
  active_tasks: number;
  error_count: number;
  uptime: number;
  health_checks: {
    connectivity: boolean;
    workspace_access: boolean;
    dependencies: boolean;
    performance: boolean;
  };
}

// Marketing Agent Specific Types
export interface MarketingTask extends AgentTask {
  campaign_id?: string;
  target_audience?: string;
  content_type?: 'blog' | 'social' | 'email' | 'video' | 'infographic';
  platform?: 'twitter' | 'linkedin' | 'discord' | 'telegram' | 'website';
  brand_guidelines?: Record<string, any>;
}

export interface MarketingOutput extends AgentOutput {
  content_metrics?: {
    word_count?: number;
    readability_score?: number;
    seo_score?: number;
    engagement_prediction?: number;
  };
  approval_status?: 'draft' | 'review' | 'approved' | 'published';
  publication_schedule?: number;
}

// Research Agent Specific Types
export interface ResearchTask extends AgentTask {
  research_type?: 'market' | 'technology' | 'user' | 'competitive' | 'trend';
  data_sources?: string[];
  analysis_methods?: string[];
  research_questions?: string[];
  hypothesis?: string;
}

export interface ResearchOutput extends AgentOutput {
  research_methodology?: string;
  data_quality?: {
    completeness: number;
    accuracy: number;
    reliability: number;
  };
  statistical_significance?: number;
  confidence_interval?: [number, number];
  recommendations?: string[];
}

// Feature Planning Agent Specific Types
export interface FeaturePlanningTask extends AgentTask {
  feature_category?: 'core' | 'advanced' | 'infrastructure' | 'ui' | 'integration';
  complexity?: 'simple' | 'moderate' | 'complex' | 'epic';
  business_value?: 'low' | 'medium' | 'high' | 'critical';
  technical_risk?: 'low' | 'medium' | 'high';
  stakeholders?: string[];
}

export interface FeaturePlanningOutput extends AgentOutput {
  technical_specifications?: Record<string, any>;
  resource_estimates?: {
    development_time: string;
    testing_time: string;
    deployment_time: string;
    team_size: number;
  };
  risk_assessment?: {
    technical_risks: Array<{risk: string; probability: number; impact: number}>;
    business_risks: Array<{risk: string; probability: number; impact: number}>;
    mitigation_strategies: string[];
  };
  dependencies?: {
    internal: string[];
    external: string[];
    technical: string[];
  };
}