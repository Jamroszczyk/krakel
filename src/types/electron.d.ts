export interface ElectronAPI {
  saveFileDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  openFileDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>;
  saveFile: (filePath: string, data: any) => Promise<{ success: boolean; error?: string }>;
  loadFile: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

