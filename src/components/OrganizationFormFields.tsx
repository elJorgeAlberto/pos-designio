import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { useOrganizationForm } from '@/lib/use-organization-form'

export function OrganizationFormFields({
  form,
  idPrefix,
  requireLegalName = true,
}: {
  form: ReturnType<typeof useOrganizationForm>['fields']
  idPrefix: string
  // false when these fields are nested inside another <form> (the inline
  // "+ Nueva empresa" block in ClientsPage) — native `required` there would
  // block submitting the *client* form even when no org is being created.
  requireLegalName?: boolean
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-legal-name`} help={fieldHelp.organizations.legalName}>
          Razón social
        </FieldLabel>
        <Input
          id={`${idPrefix}-legal-name`}
          required={requireLegalName}
          value={form.legalName}
          onChange={(e) => form.setLegalName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-trade-name`} help={fieldHelp.organizations.tradeName}>
          Nombre comercial
        </FieldLabel>
        <Input
          id={`${idPrefix}-trade-name`}
          value={form.tradeName}
          onChange={(e) => form.setTradeName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-tax-id`} help={fieldHelp.organizations.taxId}>
          RFC
        </FieldLabel>
        <Input id={`${idPrefix}-tax-id`} value={form.taxId} onChange={(e) => form.setTaxId(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-tax-regime`} help={fieldHelp.organizations.taxRegime}>
          Régimen fiscal
        </FieldLabel>
        <Input
          id={`${idPrefix}-tax-regime`}
          value={form.taxRegime}
          onChange={(e) => form.setTaxRegime(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-postal-code`} help={fieldHelp.organizations.postalCode}>
          Código postal
        </FieldLabel>
        <Input
          id={`${idPrefix}-postal-code`}
          value={form.postalCode}
          onChange={(e) => form.setPostalCode(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-address`} help={fieldHelp.organizations.address}>
          Dirección
        </FieldLabel>
        <Input
          id={`${idPrefix}-address`}
          value={form.address}
          onChange={(e) => form.setAddress(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-phone`} help={fieldHelp.organizations.phone}>
          Teléfono
        </FieldLabel>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          value={form.phone}
          onChange={(e) => form.setPhone(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-email`} help={fieldHelp.organizations.email}>
          Correo principal
        </FieldLabel>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-contact-name`} help={fieldHelp.organizations.contactName}>
          Nombre de contacto
        </FieldLabel>
        <Input
          id={`${idPrefix}-contact-name`}
          value={form.contactName}
          onChange={(e) => form.setContactName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${idPrefix}-notes`} help={fieldHelp.organizations.notes}>
          Notas
        </FieldLabel>
        <Textarea id={`${idPrefix}-notes`} value={form.notes} onChange={(e) => form.setNotes(e.target.value)} />
      </div>
    </>
  )
}
