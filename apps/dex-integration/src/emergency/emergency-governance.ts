// Emergency governance system with multi-signature controls and voting mechanisms

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface EmergencyGovernanceConfig {
  // Multi-signature settings
  requiredSignatures: number;
  totalSigners: number;
  signers: PublicKey[];
  
  // Voting settings
  votingPeriod: number; // hours
  quorumThreshold: number; // percentage
  approvalThreshold: number; // percentage
  
  // Emergency overrides
  emergencySigners: PublicKey[]; // Can act without full process
  emergencyThreshold: number; // Required emergency signatures
  emergencyTimeout: number; // Hours before emergency powers expire
  
  // Time locks
  normalActionDelay: number; // hours
  criticalActionDelay: number; // hours
  emergencyActionDelay: number; // minutes
  
  // Proposal settings
  maxActiveProposals: number;
  proposalCooldown: number; // hours between proposals from same signer
}

export interface EmergencyProposal {
  id: string;
  proposer: PublicKey;
  title: string;
  description: string;
  actionType: 'pause' | 'resume' | 'emergency_exit' | 'parameter_change' | 'signer_change' | 'recovery';
  parameters: any;
  
  // Timing
  createdAt: number;
  votingEndsAt: number;
  executionDelay: number;
  canExecuteAt: number;
  
  // Voting
  votes: ProposalVote[];
  yesVotes: number;
  noVotes: number;
  totalVotingPower: number;
  
  // Status
  status: 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled' | 'expired';
  executed: boolean;
  executedAt?: number;
  executedBy?: PublicKey;
  
  // Emergency flags
  isEmergency: boolean;
  emergencyJustification?: string;
  bypassNormalProcess: boolean;
}

export interface ProposalVote {
  voter: PublicKey;
  vote: 'yes' | 'no' | 'abstain';
  votingPower: number;
  timestamp: number;
  signature?: string;
}

export interface GovernanceState {
  // Current state
  isPaused: boolean;
  pausedBy: string;
  pausedAt: number;
  
  // Active proposals
  activeProposals: Map<string, EmergencyProposal>;
  proposalHistory: EmergencyProposal[];
  
  // Signers
  currentSigners: PublicKey[];
  emergencySigners: PublicKey[];
  signerVotingPower: Map<string, number>;
  
  // Statistics
  totalProposals: number;
  executedProposals: number;
  rejectedProposals: number;
  emergencyActions: number;
}

export interface SignatureRequest {
  id: string;
  proposalId: string;
  action: string;
  parameters: any;
  requiredSignatures: number;
  signatures: Map<string, string>; // signer address -> signature
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'ready' | 'executed' | 'expired' | 'cancelled';
}

export interface GovernanceEvent {
  id: string;
  timestamp: number;
  type: 'proposal_created' | 'vote_cast' | 'proposal_executed' | 'signer_added' | 'signer_removed' | 'emergency_action';
  proposalId?: string;
  actor: PublicKey;
  description: string;
  metadata: any;
}

export class EmergencyGovernance {
  private config: EmergencyGovernanceConfig;
  private logger: Logger;
  private connection: Connection;
  
  private state: GovernanceState;
  private pendingSignatures: Map<string, SignatureRequest> = new Map();
  private events: GovernanceEvent[] = [];
  
  private isActive: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    config: EmergencyGovernanceConfig,
    connection: Connection,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.connection = connection;
    
    // Initialize governance state
    this.state = {
      isPaused: false,
      pausedBy: '',
      pausedAt: 0,
      activeProposals: new Map(),
      proposalHistory: [],
      currentSigners: [...config.signers],
      emergencySigners: [...config.emergencySigners],
      signerVotingPower: new Map(),
      totalProposals: 0,
      executedProposals: 0,
      rejectedProposals: 0,
      emergencyActions: 0,
    };
    
    this.initializeVotingPower();
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Emergency governance already active');
      return;
    }

    this.logger.info('Starting emergency governance system', {
      totalSigners: this.config.totalSigners,
      requiredSignatures: this.config.requiredSignatures,
      emergencySigners: this.config.emergencySigners.length,
      votingPeriod: this.config.votingPeriod,
    });

    try {
      // Validate configuration
      this.validateConfiguration();
      
      // Start monitoring cycles
      this.isActive = true;
      this.startMonitoringCycles();

      this.logger.info('Emergency governance system started successfully');

    } catch (error) {
      this.logger.error('Failed to start emergency governance', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Emergency governance not active');
      return;
    }

    this.logger.info('Stopping emergency governance system');

    // Stop monitoring intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    this.isActive = false;
    this.logger.info('Emergency governance system stopped');
  }

  async createProposal(
    proposer: PublicKey,
    title: string,
    description: string,
    actionType: EmergencyProposal['actionType'],
    parameters: any,
    isEmergency: boolean = false,
    emergencyJustification?: string
  ): Promise<string> {
    if (!this.canCreateProposal(proposer)) {
      throw new Error('Proposer cannot create proposal at this time');
    }

    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    // Determine timing based on action type and emergency status
    const executionDelay = this.getExecutionDelay(actionType, isEmergency);
    const votingPeriod = isEmergency ? 
      Math.min(this.config.votingPeriod, 2) : // Max 2 hours for emergency
      this.config.votingPeriod;
    
    const proposal: EmergencyProposal = {
      id: proposalId,
      proposer,
      title,
      description,
      actionType,
      parameters,
      
      createdAt: now,
      votingEndsAt: now + (votingPeriod * 60 * 60 * 1000),
      executionDelay,
      canExecuteAt: now + (votingPeriod * 60 * 60 * 1000) + executionDelay,
      
      votes: [],
      yesVotes: 0,
      noVotes: 0,
      totalVotingPower: this.getTotalVotingPower(),
      
      status: 'active',
      executed: false,
      
      isEmergency,
      emergencyJustification,
      bypassNormalProcess: isEmergency && this.isEmergencySigner(proposer),
    };

    // Add to active proposals
    this.state.activeProposals.set(proposalId, proposal);
    this.state.totalProposals++;

    // Record event
    this.recordEvent('proposal_created', proposer, `Created proposal: ${title}`, {
      proposalId,
      actionType,
      isEmergency,
    });

    this.logger.info('Emergency proposal created', {
      proposalId,
      title,
      actionType,
      isEmergency,
      proposer: proposer.toString(),
      votingEndsAt: new Date(proposal.votingEndsAt).toISOString(),
    });

    return proposalId;
  }

  async castVote(
    voter: PublicKey,
    proposalId: string,
    vote: 'yes' | 'no' | 'abstain',
    signature?: string
  ): Promise<boolean> {
    const proposal = this.state.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'active') {
      throw new Error('Proposal is not active');
    }

    if (Date.now() > proposal.votingEndsAt) {
      throw new Error('Voting period has ended');
    }

    if (!this.isAuthorizedVoter(voter)) {
      throw new Error('Voter is not authorized');
    }

    // Check if already voted
    const existingVote = proposal.votes.find(v => v.voter.equals(voter));
    if (existingVote) {
      throw new Error('Voter has already cast a vote');
    }

    // Get voting power
    const votingPower = this.getVotingPower(voter);
    
    // Cast vote
    const voteRecord: ProposalVote = {
      voter,
      vote,
      votingPower,
      timestamp: Date.now(),
      signature,
    };

    proposal.votes.push(voteRecord);
    
    // Update vote counts
    if (vote === 'yes') {
      proposal.yesVotes += votingPower;
    } else if (vote === 'no') {
      proposal.noVotes += votingPower;
    }

    // Check if proposal should be finalized
    await this.checkProposalStatus(proposal);

    // Record event
    this.recordEvent('vote_cast', voter, `Cast ${vote} vote on proposal ${proposalId}`, {
      proposalId,
      vote,
      votingPower,
    });

    this.logger.info('Vote cast on emergency proposal', {
      proposalId,
      voter: voter.toString(),
      vote,
      votingPower,
      currentYes: proposal.yesVotes,
      currentNo: proposal.noVotes,
    });

    return true;
  }

  async executeProposal(proposalId: string, executor: PublicKey): Promise<boolean> {
    const proposal = this.state.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'passed') {
      throw new Error('Proposal has not passed');
    }

    if (Date.now() < proposal.canExecuteAt) {
      throw new Error('Proposal execution delay has not elapsed');
    }

    if (proposal.executed) {
      throw new Error('Proposal has already been executed');
    }

    if (!this.canExecuteProposal(executor, proposal)) {
      throw new Error('Executor is not authorized to execute this proposal');
    }

    this.logger.info('Executing emergency proposal', {
      proposalId,
      actionType: proposal.actionType,
      executor: executor.toString(),
    });

    try {
      // Execute the proposal action
      await this.executeProposalAction(proposal);

      // Mark as executed
      proposal.executed = true;
      proposal.executedAt = Date.now();
      proposal.executedBy = executor;
      proposal.status = 'executed';
      
      // Move to history
      this.state.activeProposals.delete(proposalId);
      this.state.proposalHistory.push(proposal);
      this.state.executedProposals++;

      // Record event
      this.recordEvent('proposal_executed', executor, `Executed proposal: ${proposal.title}`, {
        proposalId,
        actionType: proposal.actionType,
      });

      this.logger.info('Emergency proposal executed successfully', {
        proposalId,
        actionType: proposal.actionType,
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to execute emergency proposal', error, { proposalId });
      return false;
    }
  }

  async requestEmergencyAction(
    signer: PublicKey,
    action: string,
    parameters: any,
    justification: string
  ): Promise<string> {
    if (!this.isEmergencySigner(signer)) {
      throw new Error('Signer is not authorized for emergency actions');
    }

    const requestId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const signatureRequest: SignatureRequest = {
      id: requestId,
      proposalId: '', // Emergency actions don't require proposals
      action,
      parameters: { ...parameters, justification },
      requiredSignatures: this.config.emergencyThreshold,
      signatures: new Map(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.emergencyTimeout * 60 * 60 * 1000),
      status: 'pending',
    };

    this.pendingSignatures.set(requestId, signatureRequest);

    this.logger.warn('Emergency action requested', {
      requestId,
      action,
      signer: signer.toString(),
      justification,
      requiredSignatures: this.config.emergencyThreshold,
    });

    return requestId;
  }

  async signEmergencyAction(
    requestId: string,
    signer: PublicKey,
    signature: string
  ): Promise<boolean> {
    const request = this.pendingSignatures.get(requestId);
    if (!request) {
      throw new Error('Emergency request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Emergency request is not pending');
    }

    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      throw new Error('Emergency request has expired');
    }

    if (!this.isEmergencySigner(signer)) {
      throw new Error('Signer is not authorized for emergency actions');
    }

    const signerAddress = signer.toString();
    if (request.signatures.has(signerAddress)) {
      throw new Error('Signer has already signed this request');
    }

    // Add signature
    request.signatures.set(signerAddress, signature);

    this.logger.info('Emergency action signed', {
      requestId,
      signer: signerAddress,
      currentSignatures: request.signatures.size,
      requiredSignatures: request.requiredSignatures,
    });

    // Check if we have enough signatures
    if (request.signatures.size >= request.requiredSignatures) {
      request.status = 'ready';
      
      // Execute emergency action
      try {
        await this.executeEmergencyAction(request);
        request.status = 'executed';
        this.state.emergencyActions++;

        this.logger.warn('Emergency action executed', {
          requestId,
          action: request.action,
          signatures: request.signatures.size,
        });

        return true;

      } catch (error) {
        this.logger.error('Emergency action execution failed', error, { requestId });
        return false;
      }
    }

    return true;
  }

  async cancelProposal(proposalId: string, canceller: PublicKey): Promise<boolean> {
    const proposal = this.state.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'active') {
      throw new Error('Proposal is not active');
    }

    // Only proposer or emergency signers can cancel
    if (!proposal.proposer.equals(canceller) && !this.isEmergencySigner(canceller)) {
      throw new Error('Not authorized to cancel proposal');
    }

    proposal.status = 'cancelled';
    this.state.activeProposals.delete(proposalId);
    this.state.proposalHistory.push(proposal);

    this.logger.info('Proposal cancelled', {
      proposalId,
      canceller: canceller.toString(),
    });

    return true;
  }

  getProposal(proposalId: string): EmergencyProposal | null {
    return this.state.activeProposals.get(proposalId) || 
           this.state.proposalHistory.find(p => p.id === proposalId) || 
           null;
  }

  getActiveProposals(): EmergencyProposal[] {
    return Array.from(this.state.activeProposals.values());
  }

  getProposalHistory(limit?: number): EmergencyProposal[] {
    const history = [...this.state.proposalHistory].sort((a, b) => b.createdAt - a.createdAt);
    return limit ? history.slice(0, limit) : history;
  }

  getGovernanceState(): GovernanceState {
    return {
      ...this.state,
      activeProposals: new Map(this.state.activeProposals),
      proposalHistory: [...this.state.proposalHistory],
      currentSigners: [...this.state.currentSigners],
      emergencySigners: [...this.state.emergencySigners],
      signerVotingPower: new Map(this.state.signerVotingPower),
    };
  }

  getPendingSignatures(): SignatureRequest[] {
    return Array.from(this.pendingSignatures.values());
  }

  getEvents(limit?: number): GovernanceEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  // Private implementation methods

  private validateConfiguration(): void {
    if (this.config.requiredSignatures > this.config.totalSigners) {
      throw new Error('Required signatures cannot exceed total signers');
    }

    if (this.config.signers.length !== this.config.totalSigners) {
      throw new Error('Signer count does not match total signers');
    }

    if (this.config.emergencyThreshold > this.config.emergencySigners.length) {
      throw new Error('Emergency threshold cannot exceed emergency signers');
    }

    if (this.config.quorumThreshold > 100 || this.config.approvalThreshold > 100) {
      throw new Error('Threshold percentages cannot exceed 100');
    }
  }

  private initializeVotingPower(): void {
    // Initialize equal voting power for all signers
    const votingPower = 100 / this.config.totalSigners;
    
    for (const signer of this.state.currentSigners) {
      this.state.signerVotingPower.set(signer.toString(), votingPower);
    }
  }

  private canCreateProposal(proposer: PublicKey): boolean {
    // Check if proposer is authorized
    if (!this.isAuthorizedVoter(proposer)) {
      return false;
    }

    // Check cooldown period
    const now = Date.now();
    const cooldownPeriod = this.config.proposalCooldown * 60 * 60 * 1000;
    
    const recentProposals = Array.from(this.state.activeProposals.values())
      .concat(this.state.proposalHistory.slice(-10))
      .filter(p => p.proposer.equals(proposer) && (now - p.createdAt) < cooldownPeriod);

    if (recentProposals.length > 0) {
      return false;
    }

    // Check max active proposals
    if (this.state.activeProposals.size >= this.config.maxActiveProposals) {
      return false;
    }

    return true;
  }

  private getExecutionDelay(actionType: string, isEmergency: boolean): number {
    if (isEmergency) {
      return this.config.emergencyActionDelay * 60 * 1000; // Convert to milliseconds
    }

    switch (actionType) {
      case 'pause':
      case 'emergency_exit':
        return this.config.criticalActionDelay * 60 * 60 * 1000;
      default:
        return this.config.normalActionDelay * 60 * 60 * 1000;
    }
  }

  private isAuthorizedVoter(voter: PublicKey): boolean {
    return this.state.currentSigners.some(signer => signer.equals(voter));
  }

  private isEmergencySigner(signer: PublicKey): boolean {
    return this.state.emergencySigners.some(emergencySigner => emergencySigner.equals(signer));
  }

  private getVotingPower(voter: PublicKey): number {
    return this.state.signerVotingPower.get(voter.toString()) || 0;
  }

  private getTotalVotingPower(): number {
    return Array.from(this.state.signerVotingPower.values()).reduce((sum, power) => sum + power, 0);
  }

  private async checkProposalStatus(proposal: EmergencyProposal): Promise<void> {
    const now = Date.now();
    
    // Check if voting period has ended
    if (now > proposal.votingEndsAt) {
      await this.finalizeProposal(proposal);
    } else {
      // Check for early finalization (if quorum and approval thresholds are met)
      const totalVotes = proposal.yesVotes + proposal.noVotes;
      const quorumMet = (totalVotes / proposal.totalVotingPower) * 100 >= this.config.quorumThreshold;
      const approvalMet = totalVotes > 0 && (proposal.yesVotes / totalVotes) * 100 >= this.config.approvalThreshold;
      
      if (quorumMet && (approvalMet || proposal.isEmergency)) {
        await this.finalizeProposal(proposal);
      }
    }
  }

  private async finalizeProposal(proposal: EmergencyProposal): Promise<void> {
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const quorumMet = (totalVotes / proposal.totalVotingPower) * 100 >= this.config.quorumThreshold;
    const approvalMet = totalVotes > 0 && (proposal.yesVotes / totalVotes) * 100 >= this.config.approvalThreshold;

    if (quorumMet && approvalMet) {
      proposal.status = 'passed';
      this.logger.info('Proposal passed', {
        proposalId: proposal.id,
        yesVotes: proposal.yesVotes,
        noVotes: proposal.noVotes,
        totalVotingPower: proposal.totalVotingPower,
      });
    } else {
      proposal.status = 'rejected';
      this.state.rejectedProposals++;
      
      // Move to history
      this.state.activeProposals.delete(proposal.id);
      this.state.proposalHistory.push(proposal);
      
      this.logger.info('Proposal rejected', {
        proposalId: proposal.id,
        reason: !quorumMet ? 'insufficient_quorum' : 'insufficient_approval',
        yesVotes: proposal.yesVotes,
        noVotes: proposal.noVotes,
      });
    }
  }

  private canExecuteProposal(executor: PublicKey, proposal: EmergencyProposal): boolean {
    // Emergency signers can execute any passed proposal
    if (this.isEmergencySigner(executor)) {
      return true;
    }

    // Regular signers can execute non-emergency proposals
    if (!proposal.isEmergency && this.isAuthorizedVoter(executor)) {
      return true;
    }

    // Proposer can execute their own proposal
    if (proposal.proposer.equals(executor)) {
      return true;
    }

    return false;
  }

  private async executeProposalAction(proposal: EmergencyProposal): Promise<void> {
    switch (proposal.actionType) {
      case 'pause':
        await this.executePauseAction(proposal.parameters);
        break;
      case 'resume':
        await this.executeResumeAction(proposal.parameters);
        break;
      case 'emergency_exit':
        await this.executeEmergencyExitAction(proposal.parameters);
        break;
      case 'parameter_change':
        await this.executeParameterChange(proposal.parameters);
        break;
      case 'signer_change':
        await this.executeSignerChange(proposal.parameters);
        break;
      case 'recovery':
        await this.executeRecoveryAction(proposal.parameters);
        break;
      default:
        throw new Error(`Unknown action type: ${proposal.actionType}`);
    }
  }

  private async executeEmergencyAction(request: SignatureRequest): Promise<void> {
    switch (request.action) {
      case 'emergency_pause':
        await this.executePauseAction(request.parameters);
        break;
      case 'emergency_exit':
        await this.executeEmergencyExitAction(request.parameters);
        break;
      case 'fund_recovery':
        await this.executeFundRecovery(request.parameters);
        break;
      default:
        throw new Error(`Unknown emergency action: ${request.action}`);
    }
  }

  private async executePauseAction(parameters: any): Promise<void> {
    this.state.isPaused = true;
    this.state.pausedBy = parameters.reason || 'Governance decision';
    this.state.pausedAt = Date.now();
    
    this.logger.warn('System paused by governance', {
      reason: this.state.pausedBy,
      level: parameters.level || 'full',
    });
  }

  private async executeResumeAction(parameters: any): Promise<void> {
    this.state.isPaused = false;
    this.state.pausedBy = '';
    this.state.pausedAt = 0;
    
    this.logger.info('System resumed by governance', {
      reason: parameters.reason || 'Governance decision',
    });
  }

  private async executeEmergencyExitAction(parameters: any): Promise<void> {
    this.logger.error('Emergency exit action executed by governance', parameters);
    // Implementation would integrate with emergency manager
  }

  private async executeParameterChange(parameters: any): Promise<void> {
    this.logger.info('Parameter change executed by governance', parameters);
    // Implementation would update system parameters
  }

  private async executeSignerChange(parameters: any): Promise<void> {
    if (parameters.action === 'add') {
      this.state.currentSigners.push(new PublicKey(parameters.signer));
      this.state.signerVotingPower.set(parameters.signer, parameters.votingPower || 10);
    } else if (parameters.action === 'remove') {
      const signerIndex = this.state.currentSigners.findIndex(s => s.toString() === parameters.signer);
      if (signerIndex >= 0) {
        this.state.currentSigners.splice(signerIndex, 1);
        this.state.signerVotingPower.delete(parameters.signer);
      }
    }
    
    this.logger.info('Signer change executed by governance', parameters);
  }

  private async executeRecoveryAction(parameters: any): Promise<void> {
    this.logger.info('Recovery action executed by governance', parameters);
    // Implementation would integrate with recovery procedures
  }

  private async executeFundRecovery(parameters: any): Promise<void> {
    this.logger.warn('Fund recovery executed by emergency governance', parameters);
    // Implementation would execute fund recovery procedures
  }

  private recordEvent(
    type: GovernanceEvent['type'],
    actor: PublicKey,
    description: string,
    metadata: any
  ): void {
    const event: GovernanceEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      proposalId: metadata.proposalId,
      actor,
      description,
      metadata,
    };

    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    this.logger.info(`Governance event: ${description}`, {
      type,
      actor: actor.toString(),
      metadata,
    });
  }

  private startMonitoringCycles(): void {
    // Proposal monitoring (every 30 seconds)
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveProposals();
    }, 30 * 1000);

    // Cleanup expired requests (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 5 * 60 * 1000);
  }

  private monitorActiveProposals(): void {
    for (const proposal of this.state.activeProposals.values()) {
      try {
        this.checkProposalStatus(proposal);
      } catch (error) {
        this.logger.error('Error monitoring proposal', error, { proposalId: proposal.id });
      }
    }
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    
    for (const [requestId, request] of this.pendingSignatures) {
      if (now > request.expiresAt && request.status === 'pending') {
        request.status = 'expired';
        this.logger.warn('Emergency request expired', { requestId });
      }
    }

    // Remove old expired requests
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    for (const [requestId, request] of this.pendingSignatures) {
      if (request.createdAt < cutoff && request.status === 'expired') {
        this.pendingSignatures.delete(requestId);
      }
    }
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): EmergencyGovernanceConfig {
    return { ...this.config };
  }
}

export default EmergencyGovernance;