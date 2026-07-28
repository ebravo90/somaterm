import { Store, LazyStore } from '@tauri-apps/plugin-store';

class MockStore {
  private data = new Map<string, unknown>();
  
  async get(key: string) { 
    return this.data.get(key) || null; 
  }
  
  async set(key: string, value: unknown) { 
    this.data.set(key, value); 
  }
  
  async delete(key: string) { 
    this.data.delete(key); 
  }
  
  async save() {}
  async load() {}
}

// In local mocked tests, we avoid IPC calls to the plugin
export const secureVault = import.meta.env.VITE_MOCK_TAURI === 'true'
  ? new MockStore() as unknown as Store
  : new LazyStore('settings.dat') as unknown as Store;
