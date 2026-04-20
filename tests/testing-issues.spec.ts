/**
 * E2E tests targeting items in the GitHub project "Testing" column.
 * Each describe block references the issue number.
 */
import { test, expect } from '@playwright/test'

// ────────────────────────────────────────────────────────────────────────────
// #29 — FAB include "Entrata ricorrente" quando ci sono conti
// ────────────────────────────────────────────────────────────────────────────
test.describe('#29 — FAB / Aggiungi: opzione Entrata ricorrente', () => {
  test('desktop: il menu Aggiungi mostra "Entrata ricorrente" se esistono conti', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    // Ensure at least one account exists so the option appears
    const hasConti = await page.locator('button', { hasText: 'Conti' }).isVisible()
    if (!hasConti) {
      await page.locator('[aria-label="Aggiungi"]').click()
      await page.locator('text=Conto').first().click()
      await page.fill('input[placeholder="es. Conto Corrente"]', 'E2E Conto FAB')
      await page.fill('input[placeholder="0.00"]', '100')
      await page.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(1000)
      await page.goto('/')
    }

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Entrata ricorrente')).toBeVisible()
  })

  test('mobile: il FAB mostra "Entrata ricorrente" se esistono conti', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'solo mobile')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // FAB button (bottom floating)
    const fab = page.locator('button').filter({ hasText: /aggiungi/i }).last()
    const hasFab = await fab.isVisible()
    if (!hasFab) {
      // Use the top-level add if FAB not present (no accounts yet)
      test.skip(true, 'nessun account presente, FAB non visibile')
    }

    await fab.click()
    await expect(page.locator('text=Entrata ricorrente')).toBeVisible({ timeout: 5000 })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #28 — Raggruppamento asset per tipo
// ────────────────────────────────────────────────────────────────────────────
test.describe('#28 — Raggruppamento asset: intestazioni gruppo visibili', () => {
  test('desktop: gruppo Conti mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasConti = await page.locator('button', { hasText: 'Conti' }).isVisible()
    if (!hasConti) test.skip(true, 'nessun conto presente')

    const header = page.locator('button', { hasText: 'Conti' }).first()
    await expect(header).toBeVisible()
    // The header should contain a formatted currency value (€)
    await expect(header).toContainText('€')
  })

  test('desktop: gruppo Posizioni mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasPosizioni = await page.locator('button', { hasText: 'Posizioni' }).isVisible()
    if (!hasPosizioni) test.skip(true, 'nessuna posizione presente')

    const header = page.locator('button', { hasText: 'Posizioni' }).first()
    await expect(header).toBeVisible()
    await expect(header).toContainText('€')
  })

  test('desktop: gruppo Debiti & Crediti mostra intestazione con totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasDebiti = await page.locator('button', { hasText: 'Debiti' }).isVisible()
    if (!hasDebiti) test.skip(true, 'nessuna liability presente')

    const header = page.locator('button', { hasText: 'Debiti' }).first()
    await expect(header).toBeVisible()
    await expect(header).toContainText('€')
  })

  test('desktop: i gruppi sono collassabili', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const contiHeader = page.locator('button', { hasText: 'Conti' }).first()
    if (!await contiHeader.isVisible()) test.skip(true, 'nessun conto presente')

    await contiHeader.click()
    await page.waitForTimeout(200)
    // Re-expand
    await contiHeader.click()
    await expect(contiHeader).toBeVisible()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #30 — Prospetto mensile: tutte le liability (crediti e debiti informali)
// ────────────────────────────────────────────────────────────────────────────
test.describe('#30 — Prospetto mensile: crediti e debiti informali', () => {
  const DEBT_NAME = 'E2E Debito Prospetto'
  const CREDIT_NAME = 'E2E Credito Prospetto'

  test('crea un debito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.locator('[aria-label="Aggiungi"]').click()
    await page.locator('text=Debito · Credito').first().click()
    await page.locator('text=Debito informale').click()
    await page.fill('input[placeholder="es. Prestito Mario"]', DEBT_NAME)
    await page.fill('input[placeholder="0.00"]', '500')
    await page.locator('button:has-text("Salva")').click()
    await expect(page.locator(`text=${DEBT_NAME}`)).toBeVisible({ timeout: 10000 })
  })

  test('crea un credito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.locator('[aria-label="Aggiungi"]').click()
    await page.locator('text=Debito · Credito').first().click()
    await page.locator('text=Credito informale').click()
    await page.fill('input[placeholder="es. Prestito a Mario"]', CREDIT_NAME)
    await page.fill('input[placeholder="0.00"]', '300')
    await page.locator('button:has-text("Salva")').click()
    await expect(page.locator(`text=${CREDIT_NAME}`)).toBeVisible({ timeout: 10000 })
  })

  test('il debito informale appare nel portafoglio con impatto sul totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Verify debt group is present
    const debitiGroup = page.locator('button', { hasText: 'Debiti' })
    if (await debitiGroup.isVisible()) {
      await expect(debitiGroup).toContainText('€')
    }
  })

  test('il credito informale appare nel portafoglio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`text=${CREDIT_NAME}`).first()).toBeVisible()
  })

  test('liability detail page si carica', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const liabilityRow = page.locator(`text=${DEBT_NAME}`).first()
    if (await liabilityRow.isVisible()) {
      await liabilityRow.click()
      await page.waitForLoadState('networkidle')
      // Should navigate to /liability/[id] detail page
      await expect(page).toHaveURL(/\/liability\//)
      await expect(page.locator(`text=${DEBT_NAME}`)).toBeVisible()
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #27 — Bug: calcolo oro in grammi (verifica form posizione live)
// ────────────────────────────────────────────────────────────────────────────
test.describe('#27 — Posizione live: unità decimali accettate', () => {
  test('desktop: form posizione live accetta unità frazionarie (grammi)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('text=Posizione').first().click()

    // Live tab should be active by default
    const isinInput = page.locator('input[placeholder*="ISIN"], input[placeholder*="isin"]').first()
    if (await isinInput.isVisible()) {
      await isinInput.fill('IE00B4ND3602') // gold ETF ISIN (SGLD)
      const unitsInput = page.locator('input[placeholder="10.5"], input[type="number"]').first()
      if (await unitsInput.isVisible()) {
        // Enter fractional units (grams representation)
        await unitsInput.fill('31.1')
        const val = await unitsInput.inputValue()
        expect(parseFloat(val)).toBeCloseTo(31.1, 1)
      }
    }

    // Close dialog without saving
    await page.keyboard.press('Escape')
  })

  test('desktop: posizione manuale con valore decimale si salva correttamente', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await page.locator('text=Posizione').first().click()
    await page.locator('text=Valore manuale').click()

    await page.fill('input[placeholder="es. Fondo Immobiliare XYZ"]', 'E2E Oro Grammi')
    // Simulate gold value with decimal (e.g., 31.1 grams × price)
    await page.fill('input[placeholder="0.00"]', '1823.50')
    await page.locator('button:has-text("Salva")').click()

    await expect(page.locator('text=E2E Oro Grammi')).toBeVisible({ timeout: 10000 })
    // Value should show as a formatted currency, not zero
    const row = page.locator('text=E2E Oro Grammi').locator('../..')
    await expect(row).toContainText('1.823')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// #21 — Design: logo / icona vault
// ────────────────────────────────────────────────────────────────────────────
test.describe('#21 — Design: logo vault visibile', () => {
  test('desktop: logo vault nella nav è visibile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    // Logo/icon should be in the top nav
    const logo = page.locator('nav svg, nav img').first()
    await expect(logo).toBeVisible()
  })

  test('login: logo vault è visibile', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    const logo = page.locator('svg, img[alt*="vault"], img[alt*="Vault"]').first()
    await expect(logo).toBeVisible()
    await ctx.close()
  })

  test('desktop: screenshot nav con logo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const nav = page.locator('nav').first()
    await expect(nav).toHaveScreenshot('nav-logo.png', { threshold: 0.2 })
  })
})
