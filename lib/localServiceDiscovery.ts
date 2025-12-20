/**
 * Local Service Discovery Module
 * 
 * Scans common ports to discover locally running inference services.
 * Supports stable-diffusion.cpp, ComfyUI, and OpenAI-compatible APIs.
 */

export type LocalBackendType = 'SD_CPP' | 'COMFYUI' | 'DIFFSYNTH' | 'OPENAI_COMPAT' | 'UNKNOWN';

export interface LocalService {
  type: LocalBackendType;
  url: string;
  port: number;
  healthy: boolean;
  models?: string[]; // Available model names
  version?: string;  // Service version if available
}

export interface ServiceCheckResult {
  available: boolean;
  type?: LocalBackendType;
  models?: string[];
  version?: string;
  error?: string;
}

// Common ports for local inference services
const SCAN_PORTS = [
  { port: 8080, expectedType: 'SD_CPP' as LocalBackendType },      // stable-diffusion.cpp default
  { port: 8188, expectedType: 'COMFYUI' as LocalBackendType },     // ComfyUI default
  { port: 7860, expectedType: 'DIFFSYNTH' as LocalBackendType },   // Gradio-based (DiffSynth)
  { port: 1234, expectedType: 'OPENAI_COMPAT' as LocalBackendType }, // LM Studio default
  { port: 11434, expectedType: 'OPENAI_COMPAT' as LocalBackendType }, // Ollama default
  { port: 5000, expectedType: 'OPENAI_COMPAT' as LocalBackendType },  // Flask-based APIs
];

/**
 * Check if a service is available at the given URL
 */
async function checkServiceHealth(url: string, timeoutMs: number = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is ok, means server is running
  } catch {
    return false;
  }
}

/**
 * Identify service type by probing known endpoints
 */
async function identifyServiceType(baseUrl: string): Promise<{ type: LocalBackendType; models?: string[]; version?: string }> {
  const timeoutMs = 2000;
  
  // Try stable-diffusion.cpp /health endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const healthResponse = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (healthResponse.ok) {
      // It's likely sd.cpp
      return { type: 'SD_CPP' };
    }
  } catch {
    // Not sd.cpp
  }
  
  // Try ComfyUI /system_stats endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const statsResponse = await fetch(`${baseUrl}/system_stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (statsResponse.ok) {
      return { type: 'COMFYUI' };
    }
  } catch {
    // Not ComfyUI
  }
  
  // Try OpenAI-compatible /v1/models endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (modelsResponse.ok) {
      const data = await modelsResponse.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      return { type: 'OPENAI_COMPAT', models };
    }
  } catch {
    // Not OpenAI-compatible
  }
  
  // Try Gradio /info endpoint (DiffSynth-Studio)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const infoResponse = await fetch(`${baseUrl}/info`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (infoResponse.ok) {
      const data = await infoResponse.json();
      return { type: 'DIFFSYNTH', version: data.version };
    }
  } catch {
    // Not Gradio
  }
  
  // Unknown type but service is running
  return { type: 'UNKNOWN' };
}

/**
 * Scan a specific port for a running service
 */
async function scanPort(port: number, expectedType: LocalBackendType): Promise<LocalService | null> {
  const baseUrl = `http://127.0.0.1:${port}`;
  
  // First check if anything is running on this port
  const isHealthy = await checkServiceHealth(baseUrl);
  
  if (!isHealthy) {
    return null;
  }
  
  // Identify the service type
  const { type, models, version } = await identifyServiceType(baseUrl);
  
  return {
    type,
    url: baseUrl,
    port,
    healthy: true,
    models,
    version,
  };
}

/**
 * Discover all running local inference services
 */
export async function discoverLocalServices(): Promise<LocalService[]> {
  const services: LocalService[] = [];
  
  // Scan all ports in parallel
  const results = await Promise.all(
    SCAN_PORTS.map(({ port, expectedType }) => scanPort(port, expectedType))
  );
  
  // Filter out null results
  for (const service of results) {
    if (service) {
      services.push(service);
    }
  }
  
  return services;
}

/**
 * Check if a specific service URL is available
 */
export async function checkServiceUrl(url: string): Promise<ServiceCheckResult> {
  try {
    // Normalize URL
    const normalizedUrl = url.replace(/\/$/, '');
    
    // Check if service is running
    const isHealthy = await checkServiceHealth(normalizedUrl);
    
    if (!isHealthy) {
      return {
        available: false,
        error: '无法连接到服务',
      };
    }
    
    // Identify service type
    const { type, models, version } = await identifyServiceType(normalizedUrl);
    
    return {
      available: true,
      type,
      models,
      version,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * Get display name for backend type
 */
export function getBackendDisplayName(type: LocalBackendType): string {
  switch (type) {
    case 'SD_CPP':
      return 'stable-diffusion.cpp';
    case 'COMFYUI':
      return 'ComfyUI';
    case 'DIFFSYNTH':
      return 'DiffSynth-Studio';
    case 'OPENAI_COMPAT':
      return 'OpenAI Compatible';
    case 'UNKNOWN':
    default:
      return 'Unknown Service';
  }
}

/**
 * Format service info for display
 */
export function formatServiceInfo(service: LocalService): string {
  const parts = [
    getBackendDisplayName(service.type),
    `:${service.port}`,
  ];
  
  if (service.models && service.models.length > 0) {
    parts.push(`(${service.models.length} models)`);
  }
  
  if (service.version) {
    parts.push(`v${service.version}`);
  }
  
  return parts.join(' ');
}

