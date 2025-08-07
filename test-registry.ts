// Simple test to verify registry module compiles
import { ModuleRegistry, createModuleRegistry, IModuleRegistry } from './src/modules/registry';

// This should compile without errors if the registry module is working
const registry: IModuleRegistry = createModuleRegistry();
console.log('Registry module compiles successfully');
