import { addFilter } from '@wordpress/hooks'

/**
 * Replace the default null MediaUpload stub with a minimal Electron-aware
 * implementation. Uses a simple URL prompt for now; a native file dialog
 * (via IPC) can replace the prompt() call later.
 *
 * Must be imported before registerCoreBlocks() is called.
 */

interface MediaUploadProps {
  onSelect: (media: { url: string; id: number; title: string; type: string }) => void
  allowedTypes?: string[]
  multiple?: boolean
  render: (props: { open: () => void }) => React.ReactElement
}

function ElectronMediaUpload({ onSelect, allowedTypes, render }: MediaUploadProps): React.ReactElement {
  const open = async () => {
    const filters: Array<{ name: string; extensions: string[] }> = []
    if (!allowedTypes || allowedTypes.includes('image')) {
      filters.push({ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] })
    }
    if (!allowedTypes || allowedTypes.includes('video')) {
      filters.push({ name: 'Videos', extensions: ['mp4', 'webm', 'ogg', 'mov'] })
    }
    if (filters.length === 0) {
      filters.push({ name: 'All Files', extensions: ['*'] })
    }

    const filePath = await window.electronAPI.dialog.openFile(filters)
    if (!filePath) return

    const filename = filePath.split('/').pop() ?? 'media'
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    onSelect({
      url: `file://${filePath}`,
      id: Date.now(),
      title: filename,
      type: ['mp4', 'webm', 'ogg', 'mov'].includes(ext) ? 'video' : 'image'
    })
  }
  return render({ open })
}

addFilter(
  'editor.MediaUpload',
  'block-editor/electron-media-upload',
  () => ElectronMediaUpload
)
