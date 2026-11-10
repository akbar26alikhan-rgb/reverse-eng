/**
 * ArchLens - Core Types for Local App & Binary Feature Reverse Engineering
 */

export type TargetKind = 'electron' | 'javascript' | 'native_binary' | 'archive' | 'directory' | 'unknown';

export interface TargetMetadata {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  kind: TargetKind;
  detectedFormat: string;
  architecture?: string;
  fileCount?: number;
  extractedPath?: string;
  createdAt: string;
}

export interface StringClue {
  offset: number;
  value: string;
  section?: string;
  category: 'api_endpoint' | 'ipc_channel' | 'config_key' | 'dom_selector' | 'error_message' | 'filesystem_path' | 'symbol' | 'general';
}

export interface SymbolClue {
  name: string;
  type: string;
  binding?: string;
  demangled?: string;
}

export interface IPCEvidence {
  channel: string;
  direction: 'main-to-renderer' | 'renderer-to-main' | 'bidirectional';
  handlerType: 'ipcMain.handle' | 'ipcMain.on' | 'ipcRenderer.invoke' | 'ipcRenderer.send' | 'contextBridge';
  file: string;
  line?: number;
  codeSnippet: string;
}

export interface ASTClue {
  kind: 'function' | 'hook' | 'class' | 'variable' | 'event_listener' | 'worker';
  name: string;
  file: string;
  line: number;
  snippet: string;
  relevanceScore: number;
}

export interface VisualClue {
  title: string;
  type: 'ui_hierarchy' | 'dom_snapshot' | 'wireframe' | 'screenshot_simulation';
  description: string;
  data: string; // SVG or formatted hierarchy
}

export interface EvidenceItem {
  id: string;
  title: string;
  category: 'code' | 'ipc' | 'string' | 'symbol' | 'visual' | 'storage' | 'network';
  sourceFile: string;
  location?: string;
  snippet: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface MechanismStep {
  step: number;
  title: string;
  component: string;
  description: string;
  evidenceRefId?: string;
}

export interface RecreationBlueprint {
  title: string;
  language: 'typescript' | 'javascript' | 'python' | 'rust';
  targetFramework: string;
  summary: string;
  keyArchitecturalDecisions: string[];
  codeTemplate: string;
  installCommand: string;
  usageExample: string;
}

export interface FeatureInvestigation {
  id: string;
  targetId: string;
  targetName: string;
  targetKind: TargetKind;
  question: string;
  featureName: string;
  timestamp: string;
  executiveSummary: string;
  mechanismWalkthrough: MechanismStep[];
  evidenceList: EvidenceItem[];
  visualClues: VisualClue[];
  recreationBlueprint: RecreationBlueprint;
  confidenceScore: number; // 0 to 100
  tags: string[];
}

export interface SystemToolCheck {
  id: string;
  name: string;
  category: 'binary' | 'bundle' | 'runtime' | 'ai';
  isAvailable: boolean;
  version?: string;
  path?: string;
  description: string;
  fallbackAvailable: boolean;
  fallbackDetails: string;
  requiresPermissionToInstall?: boolean;
}

export interface SafeSetupStatus {
  isConfigured: boolean;
  safeModeEnabled: boolean;
  dryRunMode: boolean;
  installedTools: SystemToolCheck[];
  storagePath: string;
  mcpServerActive: boolean;
  geminiApiAvailable: boolean;
  auditLog: SetupAuditEntry[];
}

export interface SetupAuditEntry {
  timestamp: string;
  action: string;
  status: 'passed' | 'warning' | 'permission_denied' | 'modified';
  details: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
