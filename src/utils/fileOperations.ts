import type { Node, Edge } from 'reactflow';

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export const saveGraphToFile = async (nodes: Node[], edges: Edge[]): Promise<boolean> => {
  if (!window.electronAPI) {
    // Fallback for browser: download as file
    downloadJSON({ nodes, edges }, 'graph.json');
    return true;
  }

  try {
    const result = await window.electronAPI.saveFileDialog();
    if (result.canceled || !result.filePath) {
      return false;
    }

    const saveResult = await window.electronAPI.saveFile(result.filePath, { nodes, edges });
    return saveResult.success;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
};

export const loadGraphFromFile = async (): Promise<GraphData | null> => {
  if (!window.electronAPI) {
    // Fallback for browser: use file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            resolve(data);
          } catch {
            resolve(null);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  try {
    const result = await window.electronAPI.openFileDialog();
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    const loadResult = await window.electronAPI.loadFile(result.filePaths[0]);
    if (loadResult.success && loadResult.data) {
      return loadResult.data;
    }
    return null;
  } catch (error) {
    console.error('Error loading file:', error);
    return null;
  }
};

// Browser fallback: download JSON
const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

