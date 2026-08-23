import { formatDateInput, parseLocalDate, startOfDay } from '@/lib/dates'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type DateRange = { start: Date; end: Date }

const defaultPresets = [
  { label: 'Hoy', days: 1 },
  { label: 'Semana', days: 7 },
  { label: 'Mes', days: 30 },
]

export function DateRangeFilter({
  value,
  onChange,
  presets = defaultPresets,
  idPrefix = 'date-range',
}: {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: { label: string; days: number }[]
  idPrefix?: string
}) {
  function applyPreset(days: number) {
    const end = startOfDay(new Date())
    const start = startOfDay(new Date())
    start.setDate(start.getDate() - (days - 1))
    onChange({ start, end })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p.label} type="button" size="sm" variant="secondary" onClick={() => applyPreset(p.days)}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${idPrefix}-start`} help={fieldHelp.dateRange.start}>
            Fecha inicio
          </FieldLabel>
          <Input
            id={`${idPrefix}-start`}
            type="date"
            value={formatDateInput(value.start)}
            onChange={(e) => {
              if (!e.target.value) return
              onChange({ start: startOfDay(parseLocalDate(e.target.value)), end: value.end })
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${idPrefix}-end`} help={fieldHelp.dateRange.end}>
            Fecha fin
          </FieldLabel>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={formatDateInput(value.end)}
            onChange={(e) => {
              if (!e.target.value) return
              onChange({ start: value.start, end: startOfDay(parseLocalDate(e.target.value)) })
            }}
          />
        </div>
      </div>
    </div>
  )
}
