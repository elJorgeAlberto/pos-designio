import { useMemo, useState } from 'react'

// BRANDING.md rule: any Table with more than 20 rows paginates, 20 per
// page. Clamping page to totalPages (instead of an effect that resets to
// 1 on every filter change) means callers never have to remember to
// reset it themselves — shrinking the filtered set just pulls the page
// back into range on the next render.
const PAGE_SIZE = 20

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [requestedPage, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(requestedPage, totalPages)

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  return { page, setPage, totalPages, pageItems }
}
