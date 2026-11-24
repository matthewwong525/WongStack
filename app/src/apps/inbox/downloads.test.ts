// A page's files download once from the printed link, from the bar's Download, and from a team link.
import { expect, it } from 'vitest'
import { downloadAll, downloadingLine, pageFileUrl, sharedFileUrl, takeDownload } from './downloads'

const ID = 'c'.repeat(32)

it('downloads once from the printed link: download=1 is taken out, and a link without it downloads nothing', () => {
  expect(takeDownload(`?item=${ID}&download=1`)).toBe(`?item=${ID}`)
  expect(takeDownload(`?download=1&item=${ID}`)).toBe(`?item=${ID}`)
  // The query left behind asks for no download, so Back or a reload never downloads again.
  expect(takeDownload(takeDownload(`?item=${ID}&download=1`) ?? '')).toBeNull()
  for (const search of [`?item=${ID}`, `?item=${ID}&download=0`, '']) expect(takeDownload(search), search).toBeNull()
})

it('saves each file once, the first at once and the rest a moment apart', () => {
  const saved: string[] = [], waits: number[] = []
  downloadAll(['/a', '/b', '/c'], url => saved.push(url), (run, ms) => { waits.push(ms); run() })
  expect([saved, waits]).toEqual([['/a', '/b', '/c'], [400, 800]])
})

it("escapes a file's name in its address, for the person's page and for a team link, and says what starts", () => {
  expect(pageFileUrl(ID, "Kim's Q2 & Q3.xlsx")).toBe(`/apps/inbox/api/page-file?id=${ID}&name=Kim%27s+Q2+%26+Q3.xlsx`)
  expect(sharedFileUrl('k7Qm-2x_W9', 'Q2 #1.pdf')).toBe('/apps/inbox/api/shared-file?token=k7Qm-2x_W9&name=Q2+%231.pdf')
  expect(downloadingLine([{ name: 'q2-sales.xlsx', size: 1 }])).toBe('Downloading q2-sales.xlsx…')
  expect(downloadingLine([{ name: 'a', size: 1 }, { name: 'b', size: 1 }])).toBe('Downloading 2 files…')
})
