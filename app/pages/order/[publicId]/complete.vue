<template>
	<div class="max-w-lg mx-auto px-4 py-12">
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
			<div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
				<svg
					class="w-8 h-8 text-green-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-800 mb-1">
				注文が完了しました
			</h1>

			<div
				v-if="cart.lastOrderNo"
				class="mt-4"
			>
				<p class="text-sm text-gray-500">
					注文番号
				</p>
				<p class="text-4xl font-bold text-gray-800">
					#{{ String(cart.lastOrderNo).padStart(3, '0') }}
				</p>
			</div>

			<div
				v-if="orderItems.length > 0"
				class="mt-6 text-left bg-gray-50 rounded-lg p-4"
			>
				<p class="text-sm font-medium text-gray-700 mb-2">
					現在のステータス
				</p>
				<span class="inline-block text-sm bg-blue-50 text-blue-700 rounded-full px-3 py-1">
					{{ ORDER_STATUS_LABELS[OrderStatus.RECEIVED] }}
				</span>
				<ul class="mt-3 space-y-1 text-sm text-gray-700">
					<li
						v-for="item in orderItems"
						:key="item.menuId"
					>
						{{ item.name }} × {{ item.qty }}
						<span class="text-gray-400 text-xs">{{ formatPrice(item.price * item.qty) }}</span>
					</li>
				</ul>
				<div class="flex justify-between mt-3 pt-3 border-t border-gray-200">
					<span class="text-sm font-medium text-gray-700">合計</span>
					<span class="text-sm font-bold text-gray-800">{{ formatPrice(orderTotal) }}</span>
				</div>
			</div>

			<div class="mt-8 space-y-3">
				<button
					class="w-full bg-blue-600 text-white rounded-xl py-4 font-bold hover:bg-blue-700 transition"
					@click="addMore"
				>
					追加注文する
				</button>
				<NuxtLink
					:to="`/order/${route.params.publicId}`"
					class="block text-sm text-gray-500 hover:text-gray-700"
				>
					メニュー一覧へ戻る
				</NuxtLink>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { OrderStatus, ORDER_STATUS_LABELS } from '~/types'
import { formatPrice } from '~/utils/format'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const publicId = String(route.params.publicId)

const cart = useCartStore()

const orderItems = computed(() => cart.lastOrderItems)
const orderTotal = computed(() =>
	orderItems.value.reduce((sum, i) => sum + i.price * i.qty, 0),
)

onMounted(() => {
	cart.load()
})

function addMore() {
	cart.lastOrderId = null
	cart.lastOrderNo = null
	cart.lastOrderItems = []
	navigateTo(`/order/${publicId}`)
}
</script>
