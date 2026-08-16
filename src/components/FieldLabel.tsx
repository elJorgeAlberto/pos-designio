import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function FieldLabel({
  htmlFor,
  help,
  children,
}: {
  htmlFor: string
  help: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={`Ayuda: ${children}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
    </div>
  )
}
