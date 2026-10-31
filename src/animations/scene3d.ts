/**
 * 3D Scene Controller Bridge
 * Connects the UI tab shift gestures and cinematic controllers to the React 3D SystemBackground visualizer.
 */

export interface Scene3DHandle {
  updateScroll: (scroll: number) => void;
  setTab: (tab: number) => void;
  triggerBurst: () => void;
  destroy: () => void;
}

export function init3DScene(): Scene3DHandle {
  return {
    updateScroll: (scroll: number) => {
      if (typeof window !== "undefined" && window.__system3d) {
        window.__system3d.updateScroll(scroll);
      }
    },
    setTab: (tab: number) => {
      if (typeof window !== "undefined") {
        if (window.__system3d) {
          window.__system3d.setTab(tab);
        }
        window.dispatchEvent(new CustomEvent("cinema:tab-change", { detail: { tab } }));
      }
    },
    triggerBurst: () => {
      if (typeof window !== "undefined") {
        if (window.__system3d) {
          window.__system3d.triggerBurst();
        }
        window.dispatchEvent(new CustomEvent("cinema:burst"));
      }
    },
    destroy: () => {
      if (typeof window !== "undefined" && window.__system3d) {
        window.__system3d.destroy();
      }
    },
  };
}
