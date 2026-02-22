import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  pages: {
    list: () => ipcRenderer.invoke("pages:list"),
    read: (id) => ipcRenderer.invoke("pages:read", id),
    create: (draft) => ipcRenderer.invoke("pages:create", draft),
    save: (page) => ipcRenderer.invoke("pages:save", page),
    delete: (id) => ipcRenderer.invoke("pages:delete", id)
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke("dialog:openFile", filters)
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
