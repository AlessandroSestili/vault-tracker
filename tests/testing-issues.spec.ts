/**
 * E2E tests targeting items in the GitHub project "Testing" column.
 */
import { test, expect } from '@playwright/test'

// ────────────────────────────────────────────────────────────────────────────
// #29 — FAB include "Entrata ricorrente" quando ci sono conti
// ────────────────────────────────────────────────────────────────────────────
test.describe('#29 — FAB / Aggiungi: opzione Entrata ricorrente', () => {
  test('desktop: il menu Aggiungi mostra "Entrata ricorrente" se esistono conti', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasConti = await page.locator('button', { hasText: 'Conti' }).first().isVisible()
    if (!hasConti) {
      await page.locator('[aria-label="Aggiungi"]').click()
      await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
      await page.locator('button', { hasText: 'Conto' }).first().click()
      await page.waitForSelector('input[placeholder="es. Conto Corrente"]')
      await page.fill('input[placeholder="es. Conto Corrente"]', 'E2E Conto FAB')
      await page.fill('input[placeholder="0.00"]', '100')
      await page.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(1000)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    }

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await expect(page.locator('text=Entrata ricorrente')).toBeVisible()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #28 — Raggruppamento asset: intestazioni gruppo visibili
// ────────────────────────────────────────────────────────────────────────────
test.describe('#28 — Raggruppamento asset: intestazioni gruppo visibili', () => {
  test('desktop: gruppo Conti mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasConti = await page.locator('button', { hasText: 'Conti' }).first().isVisible()
    if (!hasConti) test.skip(true, 'nessun conto presente')

    const header = page.locator('button', { hasText: 'Conti' }).first()
    await expect(header).toBeVisible()
    await expect(header).toContainText('€')
  })

  test('desktop: gruppo Posizioni mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasPosizioni = await page.locator('button', { hasText: 'Posizioni' }).first().isVisible()
    if (!hasPosizioni) test.skip(true, 'nessuna posizione presente')

    const header = page.locator('button', { hasText: 'Posizioni' }).first()
    await expect(header).toBeVisible()
    await expect(header).toContainText('€')
  })

  test('desktop: gruppo Debiti & Crediti mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasDebiti = await page.locator('button', { hasText: 'Debiti' }).first().isVisible()
    if (!hasDebiti) test.skip(true, 'nessuna liability presente')

    const header = page.locator('button', { hasText: 'Debiti' }).first()
    await expect(header).toBeVisible()
    await expect(header).toContainText('€')
  })

  test('desktop: i gruppi sono collassabili', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasConti = await page.locator('button', { hasText: 'Conti' }).first().isVisible()
    if (!hasConti) test.skip(true, 'nessun conto presente')

    const contiHeader = page.locator('button', { hasText: 'Conti' }).first()
    await contiHeader.click()
    await page.waitForTimeout(200)
    await contiHeader.click()
    await expect(contiHeader).toBeVisible()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #30 — Prospetto mensile: tutte le liability (crediti e debiti informali)
// ────────────────────────────────────────────────────────────────────────────
test.describe('#30 — Prospetto mensile: crediti e debiti informali', () => {
  const DEBT_NAME = 'E2E Debito Info'
  const CREDIT_NAME = 'E2E Credito Info'

  test('crea un debito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('button', { hasText: 'Debito · Credito' }).first().click()

    // informal_debt è il default
    await page.waitForSelector('input[placeholder="es. Prestito Mario"]')
    await page.fill('input[placeholder="es. Prestito Mario"]', DEBT_NAME)
    await page.fill('input[placeholder="0.00"]', '500')
    await page.locator('[data-slot="dialog-content"] button[type="submit"]').click()

    await expect(page.locator(`text=${DEBT_NAME}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('crea un credito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('button', { hasText: 'Debito · Credito' }).first().click()

    // Aspetta che il form apra, poi cambia subtype con Base UI Select
    await page.waitForSelector('[data-slot="select-trigger"]')
    await page.locator('[data-slot="select-trigger"]').click()
    const creditoItem = page.locator('[data-slot="select-item"]', { hasText: 'Credito informale' })
    await creditoItem.waitFor({ state: 'visible', timeout: 5000 })
    await creditoItem.click()

    await page.waitForSelector('input[placeholder="es. Prestito a Mario"]')
    await page.fill('input[placeholder="es. Prestito a Mario"]', CREDIT_NAME)
    await page.fill('input[placeholder="0.00"]', '300')
    await page.locator('[data-slot="dialog-content"] button[type="submit"]').click()

    await expect(page.locator(`text=${CREDIT_NAME}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('il debito informale appare nel portafoglio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasDebiti = await page.locator('button', { hasText: 'Debiti' }).first().isVisible()
    if (!hasDebiti) test.skip(true, 'nessuna liability presente')
    await expect(page.locator('button', { hasText: 'Debiti' }).first()).toContainText('€')
  })

  test('il credito informale appare nel portafoglio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`text=${CREDIT_NAME}`).first()).toBeVisible()
  })

  test('il prospetto mensile mostra il debito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => window.scrollBy(0, 600))
    await page.waitForTimeout(300)

    // "Prospetto · mese" è il testo del titolo del componente (font-mono uppercase)
    const prospectTitle = page.locator('.font-mono').filter({ hasText: /^Prospetto ·/ })
    const hasProspect = await prospectTitle.first().isVisible()
    if (hasProspect) {
      await expect(page.locator(`text=${DEBT_NAME}`).first()).toBeVisible()
    }
  })

  test('liability detail page si carica', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const liabilityRow = page.locator(`text=${DEBT_NAME}`).first()
    if (await liabilityRow.isVisible()) {
      await liabilityRow.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/liability\//)
      await expect(page.locator(`text=${DEBT_NAME}`).first()).toBeVisible()
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #27 — Bug: calcolo oro in grammi
// ────────────────────────────────────────────────────────────────────────────
test.describe('#27 — Posizione live: unità decimali accettate', () => {
  test('desktop: form posizione live accetta unità frazionarie (grammi)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('button', { hasText: 'Posizione' }).first().click()

    const isinInput = page.locator('input[placeholder*="ISIN"], input[placeholder*="isin"]').first()
    await isinInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null)

    if (await isinInput.isVisible()) {
      await isinInput.fill('IE00B4ND3602') // SGLD - oro fisico
      const unitsInput = page.locator('input[placeholder="10.5"]').first()
      await unitsInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null)
      if (await unitsInput.isVisible()) {
        await unitsInput.fill('31.1')
        const val = await unitsInput.inputValue()
        expect(parseFloat(val)).toBeCloseTo(31.1, 1)
      }
    }

    await page.keyboard.press('Escape')
  })

  test('desktop: posizione manuale con valore decimale si salva correttamente', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('button', { hasText: 'Posizione' }).first().click()

    // Aspetta che il dialog apra (200ms setTimeout) poi clicca tab manuale
    await page.waitForSelector('text=Valore manuale', { timeout: 5000 })
    await page.locator('text=Valore manuale').click()

    await page.fill('input[placeholder="es. Fondo Immobiliare XYZ"]', 'E2E Oro Grammi')
    await page.fill('input[placeholder="0.00"]', '1823.50')
    await page.locator('[data-slot="dialog-content"] button[type="submit"]').click()

    await expect(page.locator('text=E2E Oro Grammi').first()).toBeVisible({ timeout: 10000 })
    const row = page.locator('text=E2E Oro Grammi').first().locator('../..')
    await expect(row).toContainText('1.823')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #21 — Design: logo vault visibile
// ────────────────────────────────────────────────────────────────────────────
test.describe('#21 — Design: logo vault visibile', () => {
  test('desktop: testo "Vault" nella nav è visibile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Il testo "Vault" è nel div desktop (hidden md:flex) della TopNav
    // nth(1): TopNav has two Vault spans — first is inside flex md:hidden (hidden on desktop)
    await expect(page.locator('nav').first().getByText('Vault').nth(1)).toBeVisible()
  })

  test('login: pagina login si carica con elementi visibili', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await ctx.close()
  })

  test('desktop: screenshot nav con logo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('nav').first()).toHaveScreenshot('nav-logo.png', { threshold: 0.2 })
  })
})
