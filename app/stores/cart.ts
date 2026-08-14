import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem } from '~/types'
import { MAX_ITEM_QTY } from '~/types'

const STORAGE_KEY = 'mobile-order-cart'

export const useCartStore = defineStore('cart', () => {
	const shopId = ref<string | null>(null)
	const sessionId = ref<string | null>(null)
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
			sessionId.value = data.sessionId ?? null
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
				sessionId: sessionId.value,
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
			sessionId.value = null
			items.value = []
			lastOrderId.value = null
			lastOrderNo.value = null
			lastOrderItems.value = []
		}
	}

	function setSession(id: string) {
		if (sessionId.value !== id) {
			sessionId.value = id
			save()
		}
	}

	// 店舗が違う場合は店舗情報・カート・セッションを完全初期化し、
	// 同一店舗でセッションが変わった場合は（会計済みなので）古いカートをクリアして最新セッションに切り替える
	function syncSession(id: string, currentSessionId: string) {
		if (shopId.value !== id) {
			initShop(id)
		}
		if (sessionId.value !== currentSessionId) {
			sessionId.value = currentSessionId
			items.value = []
			save()
		}
	}

	// おかわり候補として qty=0 で追加する。既にカートにある商品は数量を維持する
	function addRefillItem(item: CartItem) {
		const existing = items.value.find(i => i.menuId === item.menuId)
		if (existing) return
		items.value.push({ ...item, qty: 0 })
		save()
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
		sessionId.value = null
		items.value = []
		lastOrderId.value = null
		lastOrderNo.value = null
		lastOrderItems.value = []
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	function completeOrder(orderId: string, orderNo: number, orderedItems: CartItem[]) {
		lastOrderId.value = orderId
		lastOrderNo.value = orderNo
		lastOrderItems.value = [...orderedItems]
		items.value = []
		save()
	}

	const count = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))
	const total = computed(() =>
		items.value.reduce((sum, i) => sum + i.price * i.qty, 0),
	)

	return {
		shopId,
		sessionId,
		items,
		lastOrderId,
		lastOrderNo,
		lastOrderItems,
		count,
		total,
		load,
		initShop,
		setSession,
		syncSession,
		addItem,
		addRefillItem,
		updateQty,
		removeItem,
		clear,
		completeOrder,
	}
})
