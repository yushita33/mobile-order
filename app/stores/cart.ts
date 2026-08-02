import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem } from '~/types'
import { MAX_ITEM_QTY } from '~/types'

const STORAGE_KEY = 'mobile-order-cart'

export const useCartStore = defineStore('cart', () => {
	const shopId = ref<string | null>(null)
	const items = ref<CartItem[]>([])
	const lastOrderId = ref<string | null>(null)
	const lastOrderNo = ref<number | null>(null)
	const lastOrderItems = ref<CartItem[]>([])

	function load() {
		if (typeof localStorage === 'undefined') return
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return
			const data = JSON.parse(raw)
			shopId.value = data.shopId ?? null
			items.value = data.items ?? []
			lastOrderId.value = data.lastOrderId ?? null
			lastOrderNo.value = data.lastOrderNo ?? null
			lastOrderItems.value = data.lastOrderItems ?? []
		}
		catch {
			clear()
		}
	}

	function save() {
		if (typeof localStorage === 'undefined') return
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				shopId: shopId.value,
				items: items.value,
				lastOrderId: lastOrderId.value,
				lastOrderNo: lastOrderNo.value,
				lastOrderItems: lastOrderItems.value,
			}),
		)
	}

	function initShop(id: string) {
		if (shopId.value !== id) {
			shopId.value = id
			items.value = []
			lastOrderId.value = null
			lastOrderNo.value = null
			lastOrderItems.value = []
		}
	}

	function addItem(item: CartItem) {
		const existing = items.value.find(i => i.menuId === item.menuId)
		if (existing) {
			existing.qty = Math.min(existing.qty + item.qty, MAX_ITEM_QTY)
		}
		else {
			items.value.push({ ...item })
		}
		save()
	}

	function updateQty(menuId: string, qty: number) {
		const item = items.value.find(i => i.menuId === menuId)
		if (!item) return
		item.qty = Math.max(1, Math.min(qty, MAX_ITEM_QTY))
		save()
	}

	function removeItem(menuId: string) {
		items.value = items.value.filter(i => i.menuId !== menuId)
		save()
	}

	function clear() {
		shopId.value = null
		items.value = []
		lastOrderId.value = null
		lastOrderNo.value = null
		lastOrderItems.value = []
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	function completeOrder(orderId: string, orderNo: number, items: CartItem[]) {
		lastOrderId.value = orderId
		lastOrderNo.value = orderNo
		lastOrderItems.value = [...items]
		items.value = []
		save()
	}

	const count = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))
	const total = computed(() =>
		items.value.reduce((sum, i) => sum + i.price * i.qty, 0),
	)

	return {
		shopId,
		items,
		lastOrderId,
		lastOrderNo,
		lastOrderItems,
		count,
		total,
		load,
		initShop,
		addItem,
		updateQty,
		removeItem,
		clear,
		completeOrder,
	}
})
