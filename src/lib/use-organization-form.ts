import { useState } from 'react'

export type OrganizationFormValues = {
  legal_name: string
  trade_name: string | null
  tax_id: string | null
  tax_regime: string | null
  postal_code: string | null
  address: string | null
  phone: string | null
  email: string | null
  contact_name: string | null
  notes: string | null
}

const empty = {
  legalName: '',
  tradeName: '',
  taxId: '',
  taxRegime: '',
  postalCode: '',
  address: '',
  phone: '',
  email: '',
  contactName: '',
  notes: '',
}

// Shared by OrganizationsPage's own create/edit form and the inline
// "+ Nueva empresa" block inside ClientsPage's client form — same fields,
// same payload shape, one place to keep them in sync.
export function useOrganizationForm() {
  const [legalName, setLegalName] = useState(empty.legalName)
  const [tradeName, setTradeName] = useState(empty.tradeName)
  const [taxId, setTaxId] = useState(empty.taxId)
  const [taxRegime, setTaxRegime] = useState(empty.taxRegime)
  const [postalCode, setPostalCode] = useState(empty.postalCode)
  const [address, setAddress] = useState(empty.address)
  const [phone, setPhone] = useState(empty.phone)
  const [email, setEmail] = useState(empty.email)
  const [contactName, setContactName] = useState(empty.contactName)
  const [notes, setNotes] = useState(empty.notes)

  function reset(org?: Partial<OrganizationFormValues>) {
    setLegalName(org?.legal_name ?? empty.legalName)
    setTradeName(org?.trade_name ?? empty.tradeName)
    setTaxId(org?.tax_id ?? empty.taxId)
    setTaxRegime(org?.tax_regime ?? empty.taxRegime)
    setPostalCode(org?.postal_code ?? empty.postalCode)
    setAddress(org?.address ?? empty.address)
    setPhone(org?.phone ?? empty.phone)
    setEmail(org?.email ?? empty.email)
    setContactName(org?.contact_name ?? empty.contactName)
    setNotes(org?.notes ?? empty.notes)
  }

  function toPayload(): OrganizationFormValues {
    return {
      legal_name: legalName,
      trade_name: tradeName || null,
      tax_id: taxId || null,
      tax_regime: taxRegime || null,
      postal_code: postalCode || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      contact_name: contactName || null,
      notes: notes || null,
    }
  }

  return {
    fields: {
      legalName,
      setLegalName,
      tradeName,
      setTradeName,
      taxId,
      setTaxId,
      taxRegime,
      setTaxRegime,
      postalCode,
      setPostalCode,
      address,
      setAddress,
      phone,
      setPhone,
      email,
      setEmail,
      contactName,
      setContactName,
      notes,
      setNotes,
    },
    reset,
    toPayload,
  }
}
