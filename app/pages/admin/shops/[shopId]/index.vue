<template>
	<div>
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-xl font-bold text-gray-800">
					{{ shop?.name }}
				</h1>
				<p class="text-sm text-gray-500">
					注文URL: /order/{{ shop?.publicId }}
				</p>
			</div>
			<div class="flex gap-2">
				<button
					v-for="opt in statusFilterOptions"
					:key="opt.value"
					class="text-xs font-medium rounded-full px-3 py-1.5 border transition"
					:class="
						filterStatus === opt.value
							? 'bg-blue-600 text-white border-blue-600'
							: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
					"
					@click="filterStatus = opt.value"
				>
					{{ opt.label }}
				</button>
			</div>
		</div>

		<div
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</div>

		<div
			v-if="orders.length === 0"
			class="bg-white rounded-xl p-10 text-center shadow-sm"
		>
			<p class="text-gray-500">
				注文がありません
			</p>
		</div>

		<div
			v-else
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
		>
			<div
				v-for="order in filteredOrders"
				:key="order.id"
				class="bg-white rounded-xl shadow-sm border p-4"
			>
				<div class="flex items-center justify-between mb-2">
					<span class="font-bold text-lg text-gray-800">
						#{{ String(order.orderNo).padStart(3, '0') }}
					</span>
					<span
						class="text-xs font-medium rounded-full px-2.5 py-1"
						:class="statusBadgeClass(order.status)"
					>
						{{ ORDER_STATUS_LABELS[order.status] }}
					</span>
				</div>

				<ul class="text-sm text-gray-700 space-y-1 mb-3">
					<li
						v-for="item in order.items"
						:key="item.menuId"
					>
						{{ item.name }} × {{ item.qty }}
						<span class="text-gray-400 text-xs">
							{{ formatPrice(item.price * item.qty) }}
						</span>
					</li>
				</ul>

				<div class="flex items-center justify-between border-t border-gray-100 pt-3">
					<span class="text-xs text-gray-400">
						{{ formatDateTime(order.createdAt) }}
					</span>
					<div class="flex gap-2">
						<button
							v-if="order.status === ORDER_STATUS.RECEIVED"
							class="text-xs bg-amber-500 text-white rounded px-2.5 py-1 hover:bg-amber-600 transition"
							@click="changeStatus(order.id, ORDER_STATUS.COOKING)"
						>
							調理開始
						</button>
						<button
							v-if="order.status === ORDER_STATUS.COOKING"
							class="text-xs bg-green-600 text-white rounded px-2.5 py-1 hover:bg-green-700 transition"
							@click="changeStatus(order.id, ORDER_STATUS.COMPLETED)"
						>
							提供済み
						</button>
						<button
							v-if="order.status === ORDER_STATUS.RECEIVED"
							class="text-xs bg-gray-400 text-white rounded px-2.5 py-1 hover:bg-gray-500 transition"
							@click="changeStatus(order.id, ORDER_STATUS.CANCELLED)"
						>
							キャンセル
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Order, OrderStatus, Shop } from '~/types'
import {
	OrderStatus as ORDER_STATUS,
	ORDER_STATUS_LABELS,
} from '~/types'
import { formatPrice, formatDateTime } from '~/utils/format'

definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const route = useRoute()
const shopId = String(route.params.shopId)

const { getShopById } = useShops()
const { subscribeOrders, updateOrderStatus } = useOrders()

const shop = ref<Shop | null>(null)
const orders = ref<Order[]>([])

const filterStatus = ref<OrderStatus | 'all'>('all')
const error = ref('')

const statusFilterOptions: { value: OrderStatus | 'all', label: string }[] = [
	{ value: 'all', label: 'すべて' },
	{ value: ORDER_STATUS.RECEIVED, label: ORDER_STATUS_LABELS[ORDER_STATUS.RECEIVED] },
	{ value: ORDER_STATUS.COOKING, label: ORDER_STATUS_LABELS[ORDER_STATUS.COOKING] },
	{ value: ORDER_STATUS.COMPLETED, label: ORDER_STATUS_LABELS[ORDER_STATUS.COMPLETED] },
	{ value: ORDER_STATUS.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED] },
]

const filteredOrders = computed(() => {
	if (filterStatus.value === 'all') return orders.value
	return orders.value.filter(o => o.status === filterStatus.value)
})

onMounted(async () => {
	try {
		shop.value = await getShopById(shopId)
		subscribeOrders(shopId, (newOrders) => {
			orders.value = newOrders
		})
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '注文一覧の取得に失敗しました'
	}
})

function statusBadgeClass(status: OrderStatus) {
	switch (status) {
		case ORDER_STATUS.RECEIVED:
			return 'bg-blue-50 text-blue-700'
		case ORDER_STATUS.COOKING:
			return 'bg-amber-50 text-amber-700'
		case ORDER_STATUS.COMPLETED:
			return 'bg-green-50 text-green-700'
		case ORDER_STATUS.CANCELLED:
			return 'bg-gray-100 text-gray-500'
	}
}

async function changeStatus(orderId: string, status: OrderStatus) {
	try {
		await updateOrderStatus(shopId, orderId, status)
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : 'ステータス更新に失敗しました'
	}
}
</script>
