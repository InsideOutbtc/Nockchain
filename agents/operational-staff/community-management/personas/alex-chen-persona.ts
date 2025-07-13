import { EventEmitter } from 'events';
import { Logger } from '../../../shared/utils/logger';
import { ExpertPromptAgent } from '../../expert-prompt-agent/expert-prompt-agent';

export interface PersonaProfile {
  name: string;
  full_name: string;
  role: string;
  background: string;
  personality_traits: string[];
  expertise_areas: string[];
  communication_style: string;
  preferred_platforms: string[];
  avatar_url: string;
  bio: string;
  social_links: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
  };
}

export interface EngagementResponse {
  content: string;
  tone: string;
  platform_specific: boolean;
  includes_media: boolean;
  media_type?: string;
  hashtags?: string[];
  mentions?: string[];
  requires_follow_up: boolean;
  escalation_needed: boolean;
}

export interface PersonaMetrics {
  total_engagements: number;
  successful_engagements: number;
  average_response_time: number;
  engagement_rate: number;
  sentiment_score: number;
  platform_performance: Map<string, number>;
}

export class AlexChenPersona extends EventEmitter {
  private logger: Logger;
  private profile: PersonaProfile;
  private expertPromptAgent: ExpertPromptAgent;
  private metrics: PersonaMetrics;
  private isActive: boolean = false;
  private engagementHistory: any[] = [];
  private responseTemplates: Map<string, string[]> = new Map();

  constructor() {
    super();
    this.logger = new Logger('AlexChenPersona');
    this.expertPromptAgent = new ExpertPromptAgent();
    this.metrics = {
      total_engagements: 0,
      successful_engagements: 0,
      average_response_time: 0,
      engagement_rate: 0,
      sentiment_score: 0,
      platform_performance: new Map()
    };

    this.initializeProfile();
    this.initializeResponseTemplates();
  }

  private initializeProfile(): void {
    this.profile = {
      name: 'alex_chen',
      full_name: 'Alex Chen',
      role: 'Lead Community Manager',
      background: '5+ years in crypto community management with expertise in DeFi protocols, mining operations, and blockchain technology. Previously managed communities for major DeFi projects and mining pools.',
      personality_traits: [
        'Professional',
        'Knowledgeable',
        'Approachable',
        'Patient',
        'Analytical',
        'Empathetic',
        'Leadership-oriented',
        'Solution-focused'
      ],
      expertise_areas: [
        'DeFi protocols',
        'Mining operations',
        'Blockchain technology',
        'Community management',
        'Cryptocurrency trading',
        'Tokenomics',
        'Governance systems',
        'Risk management'
      ],
      communication_style: 'Professional yet approachable, uses technical terms appropriately, provides detailed explanations, focuses on education and problem-solving',
      preferred_platforms: ['Discord', 'Twitter', 'Telegram', 'Reddit'],
      avatar_url: 'https://nockchain.com/avatars/alex-chen.jpg',
      bio: 'Lead Community Manager @Nockchain | Building the future of decentralized mining | DeFi enthusiast | Blockchain educator | 🚀',
      social_links: {
        twitter: '@AlexChenCrypto',
        linkedin: '/in/alex-chen-crypto',
        discord: 'AlexChen#1234'
      }
    };
  }

  private initializeResponseTemplates(): void {
    // General greeting templates
    this.responseTemplates.set('greeting', [
      "Hey there! Welcome to the Nockchain community! 👋",
      "Hello! Great to have you here. How can I help you today?",
      "Welcome! Excited to see new faces in our community.",
      "Hi! Thanks for joining us. Let me know if you have any questions!"
    ]);

    // Technical explanation templates
    this.responseTemplates.set('technical_explanation', [
      "Great question! Let me break this down for you:",
      "That's a really important topic. Here's how it works:",
      "Excellent question! This is actually a core feature of our system:",
      "Thanks for asking! This is something I'm passionate about explaining:"
    ]);

    // Mining-related templates
    this.responseTemplates.set('mining_discussion', [
      "Mining is at the heart of what we do at Nockchain. Here's the key:",
      "As someone who's been in the mining space for years, I can tell you:",
      "Mining optimization is crucial for success. Let me share some insights:",
      "Great mining question! This is where our technology really shines:"
    ]);

    // DeFi explanation templates
    this.responseTemplates.set('defi_explanation', [
      "DeFi is transforming how we think about finance. Here's the breakdown:",
      "That's a fantastic DeFi question! Let me walk you through it:",
      "DeFi protocols can be complex, but here's the simple explanation:",
      "Great DeFi topic! This is where traditional finance meets innovation:"
    ]);

    // Community engagement templates
    this.responseTemplates.set('community_engagement', [
      "Love seeing the community so active! Here's my take:",
      "This is exactly the kind of discussion we need more of:",
      "Community input like this is what makes us stronger:",
      "Really appreciate you bringing this up! Here's what I think:"
    ]);

    // Problem-solving templates
    this.responseTemplates.set('problem_solving', [
      "Let's solve this together. Here's what I recommend:",
      "I've seen this before. Here's the best approach:",
      "No worries, we can definitely help with this:",
      "Thanks for reaching out! Here's how we can resolve this:"
    ]);
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Alex Chen persona');
      
      // Initialize expert prompt agent connection
      await this.expertPromptAgent.initialize();
      
      // Load historical engagement data
      await this.loadEngagementHistory();
      
      // Initialize platform-specific configurations
      await this.initializePlatformConfigs();
      
      this.isActive = true;
      this.logger.info('Alex Chen persona initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Alex Chen persona', error);
      throw error;
    }
  }

  private async loadEngagementHistory(): Promise<void> {
    // Load previous engagement history for learning
    try {
      // In production, this would load from database
      this.engagementHistory = [];
      this.logger.info('Engagement history loaded');
    } catch (error) {
      this.logger.warn('Could not load engagement history', error);
    }
  }

  private async initializePlatformConfigs(): Promise<void> {
    // Initialize platform-specific configurations
    const platforms = ['discord', 'twitter', 'telegram', 'reddit'];
    
    for (const platform of platforms) {
      this.metrics.platform_performance.set(platform, 0);
    }
  }

  async engage(engagement: any, expertGuidance?: any): Promise<EngagementResponse> {
    try {
      this.logger.info('Processing engagement', { 
        platform: engagement.platform, 
        type: engagement.type,
        topic: engagement.context.topic
      });

      // Analyze engagement context
      const context = await this.analyzeEngagementContext(engagement);
      
      // Generate appropriate response
      const response = await this.generateResponse(engagement, context, expertGuidance);
      
      // Apply platform-specific formatting
      const platformResponse = await this.formatForPlatform(response, engagement.platform);
      
      // Execute the engagement
      await this.executeEngagement(engagement, platformResponse);
      
      // Track metrics
      this.updateMetrics(engagement, platformResponse);
      
      // Store engagement history
      this.engagementHistory.push({
        engagement,
        response: platformResponse,
        timestamp: new Date(),
        success: true
      });

      return platformResponse;
      
    } catch (error) {
      this.logger.error('Failed to process engagement', { engagement, error });
      
      // Store failed engagement
      this.engagementHistory.push({
        engagement,
        response: null,
        timestamp: new Date(),
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  private async analyzeEngagementContext(engagement: any): Promise<any> {
    const context = {
      topic: engagement.context.topic,
      urgency: engagement.context.urgency,
      platform: engagement.platform,
      type: engagement.type,
      sentiment: await this.analyzeSentiment(engagement.content),
      requires_technical: this.requiresTechnicalResponse(engagement.content),
      requires_expert: engagement.context.requires_expert,
      user_history: await this.getUserHistory(engagement.user_id)
    };

    return context;
  }

  private async analyzeSentiment(content: string): Promise<number> {
    // Simple sentiment analysis - in production would use NLP service
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'love', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disappointed', 'frustrated'];
    
    const words = content.toLowerCase().split(' ');
    let sentiment = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) sentiment += 1;
      if (negativeWords.includes(word)) sentiment -= 1;
    }
    
    return Math.max(-1, Math.min(1, sentiment / words.length));
  }

  private requiresTechnicalResponse(content: string): boolean {
    const technicalKeywords = [
      'blockchain', 'mining', 'defi', 'protocol', 'smart contract', 
      'consensus', 'proof of work', 'liquidity', 'yield', 'token',
      'wallet', 'transaction', 'gas', 'fee', 'stake', 'validator'
    ];
    
    const contentLower = content.toLowerCase();
    return technicalKeywords.some(keyword => contentLower.includes(keyword));
  }

  private async getUserHistory(userId: string): Promise<any> {
    // Get user's previous interactions
    return this.engagementHistory.filter(h => h.engagement.user_id === userId);
  }

  private async generateResponse(engagement: any, context: any, expertGuidance?: any): Promise<EngagementResponse> {
    let responseContent = '';
    let tone = 'professional';
    let requiresFollowUp = false;
    let escalationNeeded = false;

    // Determine response strategy based on context
    if (context.requires_expert && expertGuidance) {
      responseContent = await this.generateExpertGuidedResponse(engagement, context, expertGuidance);
      tone = 'authoritative';
    } else if (context.requires_technical) {
      responseContent = await this.generateTechnicalResponse(engagement, context);
      tone = 'educational';
    } else if (context.sentiment < -0.5) {
      responseContent = await this.generateSupportiveResponse(engagement, context);
      tone = 'empathetic';
      requiresFollowUp = true;
    } else {
      responseContent = await this.generateStandardResponse(engagement, context);
      tone = 'friendly';
    }

    // Add personality and platform-specific elements
    responseContent = await this.addPersonalityToResponse(responseContent, engagement.platform);

    // Check if escalation is needed
    if (context.urgency === 'critical' || context.sentiment < -0.8) {
      escalationNeeded = true;
    }

    return {
      content: responseContent,
      tone,
      platform_specific: true,
      includes_media: false,
      hashtags: this.generateHashtags(engagement),
      mentions: this.generateMentions(engagement),
      requires_follow_up: requiresFollowUp,
      escalation_needed: escalationNeeded
    };
  }

  private async generateExpertGuidedResponse(engagement: any, context: any, expertGuidance: any): Promise<string> {
    const template = this.getRandomTemplate('technical_explanation');
    const expertContent = expertGuidance.response || expertGuidance.content;
    
    return `${template}\n\n${expertContent}\n\nFeel free to ask if you need any clarification!`;
  }

  private async generateTechnicalResponse(engagement: any, context: any): Promise<string> {
    const template = this.getRandomTemplate('technical_explanation');
    
    // Generate technical response based on topic
    if (context.topic.includes('mining')) {
      return `${template}\n\n${this.generateMiningExplanation(engagement.content)}`;
    } else if (context.topic.includes('defi')) {
      return `${template}\n\n${this.generateDefiExplanation(engagement.content)}`;
    } else {
      return `${template}\n\n${this.generateGeneralTechnicalExplanation(engagement.content)}`;
    }
  }

  private generateMiningExplanation(content: string): string {
    return `Our mining system uses advanced proof-of-work algorithms optimized for efficiency. The key benefits include:

• Higher hash rates with lower energy consumption
• Adaptive difficulty adjustment
• Seamless integration with mining pools
• Real-time performance monitoring

The technical implementation focuses on maximizing your mining rewards while minimizing operational costs.`;
  }

  private generateDefiExplanation(content: string): string {
    return `Our DeFi integration provides several key advantages:

• Cross-chain liquidity bridging
• Automated yield optimization
• Risk-managed smart contracts
• Real-time analytics and monitoring

The protocol is designed to maximize returns while maintaining security and transparency across all operations.`;
  }

  private generateGeneralTechnicalExplanation(content: string): string {
    return `Nockchain's architecture is built on proven blockchain principles:

• Scalable consensus mechanisms
• Security-first design approach
• Interoperable cross-chain functionality
• Developer-friendly APIs and tools

Our technology stack ensures reliability, security, and performance for all use cases.`;
  }

  private async generateSupportiveResponse(engagement: any, context: any): Promise<string> {
    const template = this.getRandomTemplate('problem_solving');
    
    return `${template}

I understand your concerns and want to make sure we address them properly. Let me help you resolve this issue step by step.

If you're experiencing any technical difficulties, I can connect you with our technical support team for immediate assistance. Your experience matters to us, and we're committed to making this right.`;
  }

  private async generateStandardResponse(engagement: any, context: any): Promise<string> {
    const template = this.getRandomTemplate('community_engagement');
    
    // Generate contextual response based on engagement type
    if (engagement.type === 'dm') {
      return `Thanks for reaching out directly! I appreciate you taking the time to connect with me. ${this.generateContextualContent(engagement)}`;
    } else if (engagement.type === 'comment') {
      return `${template} ${this.generateContextualContent(engagement)}`;
    } else {
      return `${template} ${this.generateContextualContent(engagement)}`;
    }
  }

  private generateContextualContent(engagement: any): string {
    // Generate contextual content based on engagement
    const topics = {
      community: "Building strong communities is what we're all about here at Nockchain. Your participation and feedback help us grow together.",
      product: "I'm excited to share more about our platform and how it can benefit you. Let me know what specific aspects you'd like to learn about!",
      support: "I'm here to help you succeed. Whether it's technical questions or general guidance, don't hesitate to reach out.",
      announcement: "Thanks for your interest in our latest developments! We're always working on innovations that benefit our community.",
      feedback: "Your feedback is invaluable to us. This kind of input helps us continuously improve our platform and services."
    };

    const topic = engagement.context.topic;
    return topics[topic] || topics.community;
  }

  private async addPersonalityToResponse(content: string, platform: string): Promise<string> {
    // Add Alex Chen's personality traits to the response
    let personalizedContent = content;

    // Add professional yet approachable tone
    if (!personalizedContent.includes('!')) {
      personalizedContent += '!';
    }

    // Add platform-specific elements
    if (platform === 'discord') {
      // Discord allows for more casual interaction
      personalizedContent += "\n\nFeel free to DM me if you have any questions!";
    } else if (platform === 'twitter') {
      // Twitter needs to be concise
      personalizedContent = this.truncateForTwitter(personalizedContent);
    } else if (platform === 'telegram') {
      // Telegram allows for quick responses
      personalizedContent += "\n\nLet me know if you need anything else! 👍";
    }

    return personalizedContent;
  }

  private truncateForTwitter(content: string): string {
    const maxLength = 280;
    if (content.length <= maxLength) return content;
    
    return content.substring(0, maxLength - 3) + '...';
  }

  private generateHashtags(engagement: any): string[] {
    const hashtags = ['#Nockchain'];
    
    if (engagement.context.topic.includes('mining')) {
      hashtags.push('#Mining', '#ProofOfWork', '#Blockchain');
    }
    
    if (engagement.context.topic.includes('defi')) {
      hashtags.push('#DeFi', '#Yield', '#Liquidity');
    }
    
    if (engagement.platform === 'twitter') {
      hashtags.push('#Crypto', '#Community');
    }
    
    return hashtags;
  }

  private generateMentions(engagement: any): string[] {
    const mentions = [];
    
    // Add relevant mentions based on context
    if (engagement.context.escalation_needed) {
      mentions.push('@NockchainSupport');
    }
    
    if (engagement.context.topic.includes('technical')) {
      mentions.push('@NockchainDevs');
    }
    
    return mentions;
  }

  private async formatForPlatform(response: EngagementResponse, platform: string): Promise<EngagementResponse> {
    let formattedResponse = { ...response };

    switch (platform) {
      case 'discord':
        formattedResponse = await this.formatForDiscord(formattedResponse);
        break;
      case 'twitter':
        formattedResponse = await this.formatForTwitter(formattedResponse);
        break;
      case 'telegram':
        formattedResponse = await this.formatForTelegram(formattedResponse);
        break;
      case 'reddit':
        formattedResponse = await this.formatForReddit(formattedResponse);
        break;
    }

    return formattedResponse;
  }

  private async formatForDiscord(response: EngagementResponse): Promise<EngagementResponse> {
    // Discord formatting with embeds and reactions
    return {
      ...response,
      content: response.content,
      includes_media: false,
      platform_specific: true
    };
  }

  private async formatForTwitter(response: EngagementResponse): Promise<EngagementResponse> {
    // Twitter formatting with character limits and hashtags
    let content = response.content;
    
    // Add hashtags if space allows
    if (response.hashtags && response.hashtags.length > 0) {
      const hashtagString = response.hashtags.join(' ');
      if (content.length + hashtagString.length + 1 <= 280) {
        content += ' ' + hashtagString;
      }
    }

    return {
      ...response,
      content: this.truncateForTwitter(content),
      platform_specific: true
    };
  }

  private async formatForTelegram(response: EngagementResponse): Promise<EngagementResponse> {
    // Telegram formatting with markdown support
    return {
      ...response,
      content: response.content,
      platform_specific: true
    };
  }

  private async formatForReddit(response: EngagementResponse): Promise<EngagementResponse> {
    // Reddit formatting with markdown
    return {
      ...response,
      content: response.content,
      platform_specific: true
    };
  }

  private async executeEngagement(engagement: any, response: EngagementResponse): Promise<void> {
    // Execute the actual engagement on the platform
    this.logger.info('Executing engagement', {
      platform: engagement.platform,
      type: engagement.type,
      persona: this.profile.name
    });

    // Emit engagement event for platform manager
    this.emit('engagement_executed', {
      engagement,
      response,
      persona: this.profile.name
    });
  }

  private updateMetrics(engagement: any, response: EngagementResponse): void {
    this.metrics.total_engagements++;
    this.metrics.successful_engagements++;
    
    // Update platform-specific metrics
    const platformMetric = this.metrics.platform_performance.get(engagement.platform) || 0;
    this.metrics.platform_performance.set(engagement.platform, platformMetric + 1);
    
    // Calculate engagement rate
    this.metrics.engagement_rate = this.metrics.successful_engagements / this.metrics.total_engagements;
  }

  private getRandomTemplate(templateType: string): string {
    const templates = this.responseTemplates.get(templateType) || ['Hello!'];
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  // Public methods for external integration
  async optimize(analysis: any): Promise<void> {
    try {
      this.logger.info('Optimizing Alex Chen persona based on analysis');
      
      // Optimize response templates based on performance
      await this.optimizeResponseTemplates(analysis);
      
      // Adjust communication style based on feedback
      await this.adjustCommunicationStyle(analysis);
      
      // Update platform focus based on performance
      await this.updatePlatformFocus(analysis);
      
    } catch (error) {
      this.logger.error('Failed to optimize persona', error);
    }
  }

  private async optimizeResponseTemplates(analysis: any): Promise<void> {
    // Analyze which templates perform best and adjust
    const topPerformingTemplates = analysis.top_performing_templates || [];
    
    for (const template of topPerformingTemplates) {
      if (this.responseTemplates.has(template.type)) {
        // Promote successful templates
        const templates = this.responseTemplates.get(template.type)!;
        templates.unshift(template.content);
        this.responseTemplates.set(template.type, templates.slice(0, 10)); // Keep top 10
      }
    }
  }

  private async adjustCommunicationStyle(analysis: any): Promise<void> {
    // Adjust communication style based on sentiment and engagement analysis
    if (analysis.sentiment_trend < 0) {
      // Increase empathy and support in responses
      this.profile.communication_style = 'Extra empathetic and supportive, ' + this.profile.communication_style;
    } else if (analysis.engagement_rate > 0.8) {
      // Maintain current style if performing well
      this.logger.info('Communication style performing well, maintaining current approach');
    }
  }

  private async updatePlatformFocus(analysis: any): Promise<void> {
    // Adjust platform focus based on performance metrics
    const platformPerformance = analysis.platform_performance || {};
    
    // Reorder preferred platforms based on performance
    const sortedPlatforms = Object.entries(platformPerformance)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([platform]) => platform);
    
    this.profile.preferred_platforms = sortedPlatforms;
  }

  async healthCheck(): Promise<{ healthy: boolean; issue?: string }> {
    try {
      // Check if persona is active
      if (!this.isActive) {
        return { healthy: false, issue: 'Persona is not active' };
      }

      // Check expert prompt agent connection
      const expertHealth = await this.expertPromptAgent.healthCheck();
      if (!expertHealth.healthy) {
        return { healthy: false, issue: 'Expert prompt agent connection failed' };
      }

      // Check metrics
      if (this.metrics.total_engagements > 0 && this.metrics.successful_engagements / this.metrics.total_engagements < 0.5) {
        return { healthy: false, issue: 'Low success rate in engagements' };
      }

      return { healthy: true };
      
    } catch (error) {
      return { healthy: false, issue: error.message };
    }
  }

  async restart(): Promise<void> {
    this.logger.info('Restarting Alex Chen persona');
    this.isActive = false;
    
    // Clear current state
    this.engagementHistory = [];
    
    // Reinitialize
    await this.initialize();
  }

  async getStatus(): Promise<any> {
    return {
      profile: this.profile,
      metrics: {
        ...this.metrics,
        platform_performance: Object.fromEntries(this.metrics.platform_performance)
      },
      is_active: this.isActive,
      engagement_history_size: this.engagementHistory.length
    };
  }

  async shutdown(): Promise<void> {
    this.isActive = false;
    this.logger.info('Alex Chen persona shutdown complete');
  }
}

export default AlexChenPersona;