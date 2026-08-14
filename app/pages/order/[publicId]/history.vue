<template>
	<div class="max-w-lg mx-auto px-4 pb-40">
		<div class="flex items-center justify-between py-6 mb-2">
			<h1 class="text-xl font-bold text-gray-800">
				注文履歴
			</h1>
			<NuxtLink
				:to="`/order/${route.params.publicId}`"
				class="text-sm text-gray-500 hover:text-gray-700"
			>
				メニューへ戻る
			</NuxtLink>
		</div>

		<p
			v-if="loading"
			class="text-gray-500 text-center py-12"
		>
			読み込み中...
		</p>

		<p
			v-else-if="error"
			class="text-red-600 text-center py-12 bg-red-50 rounded-lg"
		>
			{{ error }}
		</p>

		<div
			v-else-if="orders.length === 0"
			class="bg-white rounded-xl p-10 text-center shadow-sm"
		>
			<p class="text-gray-500 mb-4">
				注文履歴はありません
			</p>
			<NuxtLink
				:to="`/order/${route.params.publicId}`"
				class="text-sm text-blue-600 hover:text-blue-800"
			>
				メニューに戻る
			</NuxtLink>
		</div>

		<div
			v-else
			class="space-y-3"
		>
			<div
				v-for="order in orders"
				:key="order.id"
				class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
			>
				<div class="flex items-center justify-between mb-2 gap-2">
					<span class="font-bold text-gray-800">
						#{{ String(order.orderNo).padStart(3, '0') }}
					</span>
					<span class="text-xs text-gray-400">
						{{ formatDateTime(order.createdAt) }}
					</span>
				</div>

				<span
					class="inline-block text-xs font-medium rounded-full px-2.5 py-1"
					:class="statusBadgeClass(order.status)"
				>
					{{ ORDER_STATUS_LABELS[order.status] }}
				</span>

				<ul class="mt-3 space-y-1 text-sm text-gray-700">
					<li
						v-for="item in order.items"
						:key="item.menuId"
						class="flex items-start justify-between gap-2"
					>
						<span class="break-words min-w-0">
							{{ item.name }} × {{ item.qty }}
							<span
								v-if="!isAddable(item)"
								class="text-gray-400 text-xs"
							>
								（追加不可）
							</span>
						</span>
						<span class="text-gray-400 text-xs flex-shrink-0">
							{{ formatPrice(item.price * item.qty) }}
						</span>
					</li>
				</ul>

				<div class="flex justify-between mt-3 pt-3 border-t border-gray-200">
					<span class="text-sm font-medium text-gray-700">合計</span>
					<span class="text-sm font-bold text-gray-800">{{ formatPrice(orderTotal(order)) }}</span>
				</div>

				<button
					v-if="order.status !== ORDER_STATUS.CANCELLED"
					class="mt-3 w-full rounded-xl py-3 font-bold text-sm transition"
					:class="
						addableCount(order) > 0
							? 'bg-blue-600 text-white hover:bg-blue-700'
							: 'bg-gray-100 text-gray-400 cursor-not-allowed'
					"
					:disabled="addableCount(order) === 0"
					@click="refill(order)"
				>
					{{ addableCount(order) > 0 ? 'おかわりする' : 'おかわり（追加不可）' }}
				</button>
			</div>
		</div>

		<div
			v-if="shop"
			class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg"
		>
			<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 space-y-1">
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">現在のお会計</span>
					<span class="font-medium text-gray-800">{{ formatPrice(accountTotal) }}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">カート（{{ cart.count }} 点）</span>
					<span class="font-medium text-gray-800">{{ formatPrice(cart.total) }}</span>
				</div>
				<div class="flex justify-between pt-2 border-t border-gray-200">
					<span class="font-bold text-gray-800">合計</span>
					<span class="font-bold text-gray-800">{{ formatPrice(accountTotal + cart.total) }}</span>
				</div>
				<button
					class="mt-2 w-full bg-blue-600 text-white rounded-xl py-3 font-bold hover:bg-blue-700 transition"
					@click="navigateTo(`/order/${route.params.publicId}/cart`)"
				>
					カートを見る
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { CartItem, Menu, Order, OrderItem, OrderStatus, Shop } from '~/types'
import { DEFAULT_TABLE_ID, OrderStatus as ORDER_STATUS, ORDER_STATUS_LABELS } from '~/types'
import { formatPrice, formatDateTime } from '~/utils/format'
import { isPermissionDenied } from '~/utils/firestoreError'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const publicId = String(route.params.publicId)

const { getShopByPublicId } = useShops()
const { getMenus } = useMenus()
const { getOrdersBySession } = useOrders()
const { ensureGuestUid } = useCustomer()

const cart = useCartStore()

const shop = ref<Shop | null>(null)
const orders = ref<Order[]>([])
const menus = ref<Menu[]>([])
const loading = ref(true)
const error = ref('')

const accountTotal = computed(() =>
	orders.value.reduce(
		(sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0),
		0,
	),
)

onMounted(async () => {
	cart.load()
	try {
		// 履歴の読み取り（getOrdersBySession）は認証が必要なため、
		// 匿名認証の完了を待ってから読み取りを開始する（認証前に読むと permission-denied になる）
		await ensureGuestUid()
		const s = await getShopByPublicId(publicId)
		if (!s) {
			error.value = '店舗が見つかりませんでした'
			return
		}
		shop.value = s
		if (s.currentSessionId) {
			cart.syncSession(s.id, s.currentSessionId)
		}
		else {
			cart.initShop(s.id)
		}
		if (!s.currentSessionId) return
		const [m] = await Promise.all([getMenus(s.id)])
		menus.value = m
		orders.value = await getOrdersBySession(s.id, DEFAULT_TABLE_ID, s.currentSessionId)
	}
	catch (e) {
		// 現在セッションに読み取り不可の場合は履歴なしとして扱う
		orders.value = []
		if (!isPermissionDenied(e)) {
			error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
		}
	}
	finally {
		loading.value = false
	}
})

function orderTotal(order: Order): number {
	return order.items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

function statusBadgeClass(status: OrderStatus): string {
	switch (status) {
		case ORDER_STATUS.RECEIVED:
			return 'bg-gray-100 text-gray-600'
		case ORDER_STATUS.COOKING:
			return 'bg-orange-50 text-orange-700'
		case ORDER_STATUS.COMPLETED:
			return 'bg-green-50 text-green-700'
		case ORDER_STATUS.CANCELLED:
			return 'bg-gray-100 text-gray-400'
	}
}

function isAddable(item: OrderItem): boolean {
	const menu = menus.value.find(m => m.id === item.menuId)
	return !!menu && menu.isVisible && !menu.soldOut
}

function addableItems(order: Order): CartItem[] {
	return order.items
		.filter(isAddable)
		.map((item) => {
			const menu = menus.value.find(m => m.id === item.menuId)!
			return {
				menuId: menu.id,
				name: menu.name,
				price: menu.price,
				// おかわりは qty=0 の候補としてカートへ追加し、数量はカート画面で選択する
				qty: 0,
				menuVersion: menu.version,
			}
		})
}

function addableCount(order: Order): number {
	return addableItems(order).length
}

function refill(order: Order) {
	const items = addableItems(order)
	if (items.length === 0) return
	for (const item of items) {
		cart.addRefillItem(item)
	}
	navigateTo(`/order/${publicId}/cart`)
}
</script>
