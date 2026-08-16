import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { sileo } from 'sileo'

export function useShareImage() {
  const ref = useRef<HTMLDivElement>(null)

  async function shareImage(fileName = 'ticket.png', title = 'Ticket') {
    if (!ref.current) return
    const canvas = await html2canvas(ref.current, { backgroundColor: '#ffffff' })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title })
        } catch {
          // user cancelled the share sheet — not an error
        }
      } else {
        sileo.info({ title: 'Mantén presionada la imagen para guardarla.' })
      }
    })
  }

  return { ref, shareImage }
}
