import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useTabStore } from './useTabStore'

describe('useTabStore', () => {
    beforeEach(() => {
        // Reset store
        const { setState } = useTabStore
        setState({ tabs: [], activeTabId: null })
    })

    it('starts with empty state', () => {
        const state = useTabStore.getState()
        expect(state.tabs).toEqual([])
        expect(state.activeTabId).toBeNull()
    })

    it('adds a tab and makes it active', () => {
        const { addTab } = useTabStore.getState()
        let id: string = ''

        act(() => {
            id = addTab({ name: 'Test Tab', type: 'request' })
        })

        const state = useTabStore.getState()
        expect(state.tabs).toHaveLength(1)
        expect(state.tabs[0].id).toBe(id)
        expect(state.activeTabId).toBe(id)
    })

    it('closes a tab', () => {
        const { addTab, closeTab } = useTabStore.getState()
        let id: string = ''

        act(() => {
            id = addTab({ name: 'Test Tab', type: 'request' })
        })

        act(() => {
            closeTab(id)
        })

        const state = useTabStore.getState()
        expect(state.tabs).toHaveLength(0)
        expect(state.activeTabId).toBeNull()
    })
})
