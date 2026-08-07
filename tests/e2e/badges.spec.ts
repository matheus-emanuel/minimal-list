import path from 'node:path'
import { test, expect } from '@playwright/test'

test.describe('Badge feed (AT-005, AT-006, AT-007)', () => {
  test('logged-in user uploads a badge photo and can like a post', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'E2E_TEST_USER_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    await page.goto('/badges')
    await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures', 'sample-badge.jpg'))
    await page.getByRole('button', { name: 'Publicar badge' }).click()

    const likeButton = page.getByRole('button', { name: /❤/ }).first()
    await expect(likeButton).toBeVisible()
    await likeButton.click()
  })

  test('rejects a file larger than 5MB before upload', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'E2E_TEST_USER_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    await page.goto('/badges')
    await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures', 'oversized-badge.jpg'))
    await page.getByRole('button', { name: 'Publicar badge' }).click()
    await expect(page.getByText(/até 5MB/)).toBeVisible()
  })

  test('logged-in user can report a post', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'E2E_TEST_USER_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    await page.goto('/badges')
    page.once('dialog', (dialog) => dialog.accept('Conteúdo impróprio'))
    await page.getByRole('button', { name: 'Denunciar' }).first().click()
    await expect(page.getByRole('button', { name: 'Denunciado' }).first()).toBeVisible()
  })
})
