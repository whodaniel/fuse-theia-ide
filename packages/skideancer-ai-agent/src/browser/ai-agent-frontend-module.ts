/**
 * @fuse/skideancer-ai-agent - Frontend Module
 * 
 * Binds all frontend services and UI components for the AI Agent system
 */

import { ContainerModule } from '@ide/core/shared/inversify';
import { FrontendApplicationContribution, WidgetFactory, bindViewContribution } from '@ide/core/lib/browser';
import { AgentService, AIFlowService } from '../common/types';
import { AgentServiceImpl } from '../common/agent-service';
import { AIFlowServiceImpl } from '../common/ai-flow-service';
import { CodeAnalysisCapability } from '../common/capabilities/code-analysis';
import { SuggestionProcessorCapability } from '../common/capabilities/suggestion-processor';
import { SemanticNavigationCapability } from '../common/capabilities/semantic-navigation';
import { EmbeddingVectorService, EmbeddingVectorServiceImpl, SimpleEmbeddingProvider } from '../common/services/embedding-vector-service';
import { RelatedInformationService, RelatedInformationServiceImpl } from '../common/services/related-information-service';
import { AIAgentViewContribution, AI_AGENT_WIDGET_FACTORY_ID } from './ai-agent-view-contribution';
import { AIAgentWidget } from './ai-agent-widget';

export default new ContainerModule(bind => {
    // === Core Services ===
    
    // Agent Service (singleton)
    bind(AgentServiceImpl).toSelf().inSingletonScope();
    bind(AgentService).toService(AgentServiceImpl);
    
    // AI Flow Service (singleton)
    bind(AIFlowServiceImpl).toSelf().inSingletonScope();
    bind(AIFlowService).toService(AIFlowServiceImpl);
    
    // Embedding Vector Service
    bind(EmbeddingVectorServiceImpl).toSelf().inSingletonScope();
    bind(EmbeddingVectorService).toService(EmbeddingVectorServiceImpl);
    bind(SimpleEmbeddingProvider).toSelf().inSingletonScope();
    
    // Related Information Service
    bind(RelatedInformationServiceImpl).toSelf().inSingletonScope();
    bind(RelatedInformationService).toService(RelatedInformationServiceImpl);
    
    // === Capabilities ===
    
    bind(CodeAnalysisCapability).toSelf().inSingletonScope();
    bind(SuggestionProcessorCapability).toSelf().inSingletonScope();
    bind(SemanticNavigationCapability).toSelf().inSingletonScope();
    
    // === UI Components ===
    
    // Agent View Widget
    bindViewContribution(bind, AIAgentViewContribution);
    bind(FrontendApplicationContribution).toService(AIAgentViewContribution);
    
    bind(AIAgentWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: AI_AGENT_WIDGET_FACTORY_ID,
        createWidget: () => ctx.container.get(AIAgentWidget)
    })).inSingletonScope();
});
