import * as fs from 'fs';
import * as path from 'path';
import { AgentConfig, GraphConfig } from '../types';

/**
 * Configuration Manager
 * Handles loading and saving of agent and graph configurations
 */
export class ConfigManager {
  private configDir: string;
  private agentsDir: string;
  private graphsDir: string;

  constructor(baseDir: string = './config') {
    this.configDir = baseDir;
    this.agentsDir = path.join(baseDir, 'agents');
    this.graphsDir = path.join(baseDir, 'graphs');
    
    this.ensureDirectories();
  }

  /**
   * Ensure configuration directories exist (but don't overwrite existing)
   */
  private ensureDirectories(): void {
    [this.configDir, this.agentsDir, this.graphsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } else {
        console.log(`Directory exists: ${dir}`);
      }
    });
  }

  /**
   * Save agent configuration
   */
  async saveAgentConfig(config: AgentConfig): Promise<string> {
    const filename = `${config.name}.json`;
    const filepath = path.join(this.agentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    
    return filepath;
  }

  /**
   * Load agent configuration
   */
  async loadAgentConfig(name: string): Promise<AgentConfig | null> {
    const filepath = path.join(this.agentsDir, `${name}.json`);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as AgentConfig;
  }

  /**
   * List all agent configurations
   */
  async listAgents(): Promise<string[]> {
    if (!fs.existsSync(this.agentsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.agentsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Save graph configuration
   */
  async saveGraphConfig(config: GraphConfig): Promise<string> {
    const filename = `${config.name}.json`;
    const filepath = path.join(this.graphsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    
    return filepath;
  }

  /**
   * Load graph configuration
   */
  async loadGraphConfig(name: string): Promise<GraphConfig | null> {
    const filepath = path.join(this.graphsDir, `${name}.json`);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as GraphConfig;
  }

  /**
   * List all graph configurations
   */
  async listGraphs(): Promise<string[]> {
    if (!fs.existsSync(this.graphsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.graphsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Delete agent configuration
   */
  async deleteAgentConfig(name: string): Promise<boolean> {
    const filepath = path.join(this.agentsDir, `${name}.json`);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    
    return false;
  }

  /**
   * Delete graph configuration
   */
  async deleteGraphConfig(name: string): Promise<boolean> {
    const filepath = path.join(this.graphsDir, `${name}.json`);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();