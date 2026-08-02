<template>
	<div class="max-w-lg mx-auto px-4 py-6">
		<h1 class="text-xl font-bold text-gray-800 mb-4">
			カート
		</h1>

		<p
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</p>

		<div
			v-if="cart.items.length === 0"
			class="bg-white rounded-xl p-10 text-center shadow-sm"
		>
			<p class="text-gray-500 mb-4">
				カートは空です
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
				v-for="item in cart.items"
				:key="item.menuId"
				class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
			>
				<div class="flex items-center justify-between gap-2 mb-2">
					<p class="font-medium text-gray-800 text-sm break-words min-w-0">
						{{ item.name }}
					</p>
					<button
						class="text-gray-400 hover:text-red-600 text-sm flex-shrink-0"
						@click="cart.removeItem(item.menuId)"
					>
						×
					</button>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<button
							class="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
							@click="cart.updateQty(item.menuId, item.qty - 1)"
						>
							−
						</button>
						<span class="w-8 text-center text-sm">{{ item.qty }}</span>
						<button
							class="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
							@click="cart.updateQty(item.menuId, item.qty + 1)"
						>
							＋
						</button>
					</div>
					<span class="text-sm text-gray-700 font-medium">
						{{ formatPrice(item.price * item.qty) }}
					</span>
				</div>
			</div>

			<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
				<span class="font-bold text-gray-800">合計</span>
				<span class="font-bold text-lg text-gray-800">{{ formatPrice(cart.total) }}</span>
			</div>

			<button
				class="w-full bg-blue-600 text-white rounded-xl py-4 font-bold shadow hover:bg-blue-700 transition disabled:opacity-50"
				:disabled="submitting"
				@click="submitOrder"
			>
				{{ submitting ? '注文中...' : '注文を確定する' }}
			</button>

			<NuxtLink
				:to="`/order/${route.params.publicId}`"
				class="block text-center text-sm text-gray-500 hover:text-gray-700"
			>
				メニューに戻る
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
import { formatPrice } from '~/utils/format'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const publicId = String(route.params.publicId)

const { createOrder } = useOrders()

const cart = useCartStore()
const submitting = ref(false)
const error = ref('')

onMounted(() => {
	cart.load()
})

async function submitOrder() {
	if (cart.items.length === 0) return
	submitting.value = true
	error.value = ''
	try {
		if (!cart.shopId) throw new Error('店舗情報が見つかりません')
		const { orderId, orderNo } = await createOrder(cart.shopId, cart.items)
		cart.completeOrder(orderId, orderNo, cart.items)
		navigateTo(`/order/${publicId}/complete`)
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '注文に失敗しました'
	}
	finally {
		submitting.value = false
	}
}
</script>
