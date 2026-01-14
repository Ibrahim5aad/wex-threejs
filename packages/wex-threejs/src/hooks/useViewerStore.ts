import { create } from 'zustand';
import * as THREE from 'three';
import type { LoadedModel, ViewerSettings } from '../types';
import { DEFAULT_VIEWER_SETTINGS } from '../types';

interface ViewerStore {
  // State
  models: Map<string, LoadedModel>;
  selectedObjects: THREE.Object3D[];
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  settings: ViewerSettings;

  // Actions
  addModel: (model: LoadedModel) => void;
  removeModel: (id: string) => void;
  clearModels: () => void;
  setSelectedObjects: (objects: THREE.Object3D[]) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<ViewerSettings>) => void;
}

export const useViewerStore = create<ViewerStore>((set, get) => ({
  // Initial state
  models: new Map(),
  selectedObjects: [],
  isLoading: false,
  loadingProgress: 0,
  error: null,
  settings: DEFAULT_VIEWER_SETTINGS,

  // Actions
  addModel: (model) => {
    const models = new Map(get().models);
    models.set(model.id, model);
    set({ models });
  },

  removeModel: (id) => {
    const models = new Map(get().models);
    models.delete(id);
    set({ models });
  },

  clearModels: () => {
    set({ models: new Map() });
  },

  setSelectedObjects: (objects) => {
    set({ selectedObjects: objects });
  },

  setLoading: (loading, progress = 0) => {
    set({ isLoading: loading, loadingProgress: progress });
  },

  setError: (error) => {
    set({ error });
  },

  updateSettings: (newSettings) => {
    set({ settings: { ...get().settings, ...newSettings } });
  },
}));

// Selector hooks for better performance
export const useModels = () => useViewerStore((state) => state.models);
export const useSelectedObjects = () => useViewerStore((state) => state.selectedObjects);
export const useIsLoading = () => useViewerStore((state) => state.isLoading);
export const useLoadingProgress = () => useViewerStore((state) => state.loadingProgress);
export const useViewerSettings = () => useViewerStore((state) => state.settings);
export const useViewerError = () => useViewerStore((state) => state.error);
