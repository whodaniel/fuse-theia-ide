/**
 * @fuse/theia-ai-agent - Backend Module
 * 
 * Server-side bindings for the AI Agent system
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { AgentService, AIFlowService } from '../common/types';
import { AgentServiceImpl } from '../common/agent-service';
import { AIFlowServiceImpl } from '../common/ai-flow-service';

export default new ContainerModule(bind => {
    // Core Services
    bind(AgentServiceImpl).toSelf().inSingletonScope();
    bind(AgentService).toService(AgentServiceImpl);
    
    bind(AIFlowServiceImpl).toSelf().inSingletonScope();
    bind(AIFlowService).toService(AIFlowServiceImpl);
});
