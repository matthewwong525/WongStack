// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

const KEY = 'wongstack-theme'
const root = document.documentElement
const button = () => screen.getByRole('button')
const icon = () => button().querySelector('svg')!.getAttribute('class')

beforeEach(() => { localStorage.clear(); root.classList.remove('dark') })
afterEach(() => { cleanup(); vi.restoreAllMocks(); root.classList.remove('dark') })

it('starts light, and one tap turns the page dark, saves it, and swaps the label and icon', () => {
  render(<ThemeToggle />)
  expect(root.classList.contains('dark')).toBe(false)
  expect(button().getAttribute('aria-label')).toBe('Switch to dark')
  expect(button().getAttribute('aria-pressed')).toBe('false')
  expect(icon()).toMatch(/moon/)
  fireEvent.click(button())
  expect(root.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem(KEY)).toBe('dark')
  expect(button().getAttribute('aria-label')).toBe('Switch to light')
  expect(button().getAttribute('aria-pressed')).toBe('true')
  expect(icon()).toMatch(/sun/)
  fireEvent.click(button())
  expect(root.classList.contains('dark')).toBe(false)
  expect(localStorage.getItem(KEY)).toBe('light')
})

it('starts dark when index.html applied a saved dark choice', () => {
  root.classList.add('dark')
  render(<ThemeToggle />)
  expect(button().getAttribute('aria-label')).toBe('Switch to light')
})

it('is a 44px target', () => {
  render(<ThemeToggle />)
  expect(button().className.split(' ')).toContain('size-11')
})

it('still switches when storage is off, only without remembering', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  render(<ThemeToggle />)
  fireEvent.click(button())
  expect(root.classList.contains('dark')).toBe(true)
  expect(button().getAttribute('aria-label')).toBe('Switch to light')
})
