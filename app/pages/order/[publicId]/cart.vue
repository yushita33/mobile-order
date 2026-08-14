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
						:disabled="submitting"
						@click="cart.removeItem(item.menuId)"
					>
						×
					</button>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<button
							class="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
							:disabled="submitting || item.qty === 0"
							@click="cart.updateQty(item.menuId, item.qty - 1)"
						>
							−
						</button>
						<span class="w-8 text-center text-sm">{{ item.qty }}</span>
						<button
							class="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
							:disabled="submitting"
							@click="cart.updateQty(item.menuId, item.qty + 1)"
						>
							＋
						</button>
						<span
							v-if="item.qty === 0"
							class="text-xs text-gray-400"
						>
							数量を選択してください
						</span>
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

			<p
				v-if="orderableItems.length === 0"
				class="text-sm text-gray-500 text-center"
			>
				数量を選択してください
			</p>

			<button
				class="w-full bg-blue-600 text-white rounded-xl py-4 font-bold shadow hover:bg-blue-700 transition disabled:opacity-50"
				:disabled="submitting || orderableItems.length === 0"
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
import { DEFAULT_TABLE_ID } from '~/types'
import type { OrderItem } from '~/types'
import { formatPrice } from '~/utils/format'
import { isPermissionDenied } from '~/utils/firestoreError'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const publicId = String(route.params.publicId)

const { createOrder } = useOrders()
const { ensureGuestUid } = useCustomer()
const { getCurrentSessionId } = useSessions()

const cart = useCartStore()
const submitting = ref(false)
const error = ref('')

// 数量 0（おかわり候補）を除いた、実際に注文できる商品
const orderableItems = computed(() => cart.items.filter(i => i.qty > 0))

onMounted(async () => {
	cart.load()
	// 会計（セッション切替）で古いカートが残っていても注文されないよう、
	// カート表示時に最新セッションへ同期する
	if (!cart.shopId) return
	const sessionId = await getCurrentSessionId(cart.shopId).catch(() => null)
	if (sessionId) cart.syncSession(cart.shopId, sessionId)
})

async function submitOrder() {
	if (cart.items.length === 0) return
	if (orderableItems.value.length === 0) {
		error.value = '数量を選択してください'
		return
	}
	// 注文対象の商品は再試行中も固定する。
	// 以降の非同期処理中にセッション同期（cart.syncSession/clear）でカートが変わっても、
	// 今回注文する内容が変わらないよう、コピーを取って確定する
	const orderItems = orderableItems.value.map(item => ({ ...item }))
	submitting.value = true
	error.value = ''
	try {
		if (!cart.shopId) throw new Error('店舗情報が見つかりません')
		const customerUid = await ensureGuestUid()

		// 会計（セッション切替）によって古いカートから注文されないよう、
		// 確定時に最新のセッションIDを取得し、拒否された場合は最新で1回だけ再試行する
		let lastError: unknown
		for (let attempt = 0; attempt < 2; attempt++) {
			const sessionId = await getCurrentSessionId(cart.shopId)
			if (!sessionId) throw new Error('注文の受付がまだ開始されていません。お店にご確認ください。')
			cart.setSession(sessionId)
			try {
				const { orderId, orderNo } = await createOrder(cart.shopId, {
					tableId: DEFAULT_TABLE_ID,
					sessionId,
					customerUid,
					items: orderItems as OrderItem[],
				})
				cart.completeOrder(orderId, orderNo, orderItems)
				navigateTo(`/order/${publicId}/complete`)
				return
			}
			catch (e) {
				lastError = e
				// セッション切り替えの競合（Firestore Rulesの拒否）だけを再試行対象にする。
				// それ以外（データ不正・ネットワーク・二重注文のリスク等）は即時終了して握りつぶさない
				if (!isPermissionDenied(e) || attempt === 1) {
					break
				}
			}
		}
		throw lastError
	}
	catch (e) {
		// permission-denied は内部のエラー文字列（PERMISSION_DENIED: ...）をそのまま見せず、
		// 会計・セッション切替の可能性がある旨の利用者向け文言に変換する
		error.value = isPermissionDenied(e)
			? '注文状態が更新されています。最新の状態で再度お試しください。'
			: e instanceof Error ? e.message : '注文に失敗しました。最新の状態で再度お試しください。'
	}
	finally {
		submitting.value = false
	}
}
</script>
