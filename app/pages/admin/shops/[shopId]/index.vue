<template>
	<div>
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
			<div class="min-w-0">
				<h1 class="text-xl font-bold text-gray-800 break-words">
					{{ shop?.name }}
				</h1>
				<p class="text-sm text-gray-500 break-all">
					注文URL: /order/{{ shop?.publicId }}
				</p>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
					<button
						v-for="opt in statusFilterOptions"
						:key="opt.value"
						class="text-xs font-medium rounded-full px-3 py-1.5 border transition whitespace-nowrap flex-shrink-0"
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
				<button
					class="text-xs font-medium rounded-lg bg-amber-500 text-white px-4 py-2 hover:bg-amber-600 transition whitespace-nowrap"
					:disabled="checkoutSubmitting"
					@click="openCheckoutModal"
				>
					会計を済ませる
				</button>
			</div>
		</div>

		<div
			v-if="success"
			class="mb-4 text-sm text-green-700 bg-green-50 rounded p-3"
		>
			{{ success }}
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
					<span
						v-if="isLegacyActive(order)"
						class="text-xs font-medium rounded-full px-2.5 py-1 bg-purple-50 text-purple-700"
					>
						旧セッション
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

				<p
					v-if="order.status === ORDER_STATUS.CANCELLED"
					class="text-xs text-gray-400 mb-3"
				>
					理由: {{ order.cancelReason ? (CANCEL_REASON_LABELS[order.cancelReason as CancelReason] ?? order.cancelReason) : '未選択' }}
				</p>

				<div class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
					<span class="text-xs text-gray-400">
						{{ formatDateTime(order.createdAt) }}
					</span>
					<div class="flex flex-wrap gap-2">
						<button
							v-if="order.status === ORDER_STATUS.RECEIVED"
							class="text-xs bg-amber-500 text-white rounded px-2.5 py-1 hover:bg-amber-600 transition whitespace-nowrap"
							@click="changeStatus(order.id, ORDER_STATUS.COOKING)"
						>
							調理開始
						</button>
						<button
							v-if="order.status === ORDER_STATUS.COOKING"
							class="text-xs bg-green-600 text-white rounded px-2.5 py-1 hover:bg-green-700 transition whitespace-nowrap"
							@click="changeStatus(order.id, ORDER_STATUS.COMPLETED)"
						>
							提供済み
						</button>
						<button
							v-if="order.status !== ORDER_STATUS.CANCELLED"
							class="text-xs bg-gray-400 text-white rounded px-2.5 py-1 hover:bg-gray-500 transition whitespace-nowrap"
							@click="openCancelModal(order)"
						>
							キャンセル
						</button>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="cancelTarget"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="closeCancelModal"
		>
			<div class="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
				<h2 class="text-lg font-bold text-gray-800 mb-1">
					{{ cancelModalTitle }}
				</h2>
				<p class="text-sm text-gray-500 mb-4">
					キャンセル理由を選択してください（任意）
				</p>
				<select
					v-model="cancelReason"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 mb-6"
				>
					<option value="">
						未選択
					</option>
					<option
						v-for="(label, value) in CANCEL_REASON_LABELS"
						:key="value"
						:value="value"
					>
						{{ label }}
					</option>
				</select>
				<div class="flex gap-2 justify-end">
					<button
						class="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
						@click="closeCancelModal"
					>
						戻る
					</button>
					<button
						class="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition"
						@click="confirmCancel"
					>
						キャンセルを実行
					</button>
				</div>
			</div>
		</div>
		<div
			v-if="checkoutConfirm"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="closeCheckoutModal"
		>
			<div class="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
				<h2 class="text-lg font-bold text-gray-800 mb-1">
					会計を済ませますか？
				</h2>
				<template v-if="currentSessionActiveCount === 0">
					<p class="text-sm text-gray-500 mb-6">
						現在の注文履歴がお客様の画面からリセットされ、新しい注文セッションが開始されます。
						会計が完了してから実施してください。
					</p>
					<div class="flex gap-2 justify-end">
						<button
							class="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
							@click="closeCheckoutModal"
						>
							戻る
						</button>
						<button
							class="text-sm bg-amber-500 text-white rounded-lg px-4 py-2 hover:bg-amber-600 transition disabled:opacity-50"
							:disabled="checkoutSubmitting"
							@click="confirmCheckout"
						>
							{{ checkoutSubmitting ? '処理中...' : '会計を実行' }}
						</button>
					</div>
				</template>
				<template v-else>
					<div class="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
						未提供の注文が {{ currentSessionActiveCount }} 件あります。
						すべて「提供済み」または「キャンセル」にしてから会計してください。
					</div>
					<p class="text-xs text-gray-400 mb-4">
						どうしても会計する場合は「強制終了」でセッションを切り替えられます。
						未提供の注文は「要確認」として残ります。
					</p>
					<div class="flex gap-2 justify-end">
						<button
							class="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
							@click="closeCheckoutModal"
						>
							戻る
						</button>
						<button
							class="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition"
							@click="openForceConfirm"
						>
							強制終了（未提供を残す）
						</button>
					</div>
				</template>
			</div>
		</div>
		<div
			v-if="forceConfirm"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="closeForceConfirm"
		>
			<div class="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
				<h2 class="text-lg font-bold text-gray-800 mb-1">
					強制終了しますか？
				</h2>
				<p class="text-sm text-gray-500 mb-6">
					未提供の注文 {{ currentSessionActiveCount }} 件がセッション終了後もデータとして残り、
					管理画面の「要確認」で追跡できます。お客様の注文履歴からは表示されなくなります。
					よろしいですか？
				</p>
				<div class="flex gap-2 justify-end">
					<button
						class="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
						@click="closeForceConfirm"
					>
						戻る
					</button>
					<button
						class="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition disabled:opacity-50"
						:disabled="checkoutSubmitting"
						@click="confirmForce"
					>
						{{ checkoutSubmitting ? '処理中...' : '強制終了を実行' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { CancelReason, Order, OrderStatus, Shop } from '~/types'
import {
	OrderStatus as ORDER_STATUS,
	ORDER_STATUS_LABELS,
	CANCEL_REASON_LABELS,
} from '~/types'
import { formatPrice, formatDateTime } from '~/utils/format'

definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const route = useRoute()
const shopId = String(route.params.shopId)

const { getShopById, subscribeShop } = useShops()
const { subscribeOrders, updateOrderStatus } = useOrders()
const { ensureSession, startNewSession, forceEndSession } = useSessions()

const shop = ref<Shop | null>(null)
const orders = ref<Order[]>([])

type FilterStatus = OrderStatus | 'all' | 'active' | 'legacy'

const filterStatus = ref<FilterStatus>('active')
const error = ref('')
const success = ref('')
const cancelTarget = ref<Order | null>(null)
const cancelReason = ref('')
const checkoutConfirm = ref(false)
const checkoutSubmitting = ref(false)
const forceConfirm = ref(false)

const cancelModalTitle = computed(() => {
	if (!cancelTarget.value) return ''
	return cancelTarget.value.status === ORDER_STATUS.COMPLETED
		? '提供済みの注文を取り消します。内容をご確認のうえ実行してください。'
		: 'この注文をキャンセルします。よろしいですか？'
})

const currentSessionId = computed(() => shop.value?.currentSessionId ?? null)

const isPendingStatus = (s: OrderStatus) => s === ORDER_STATUS.RECEIVED || s === ORDER_STATUS.COOKING

// 現在セッションの未提供（受付済み/調理中）注文。厨房の通常の対応対象
const currentSessionActiveOrders = computed(() =>
	orders.value.filter(o =>
		isPendingStatus(o.status) && o.sessionId === currentSessionId.value,
	),
)

// 旧セッション（強制終了等の積み残し）や sessionId 不明の未提供注文。要確認として追跡する
const legacyActiveOrders = computed(() =>
	orders.value.filter(o =>
		isPendingStatus(o.status) && o.sessionId !== currentSessionId.value,
	),
)

const currentSessionActiveCount = computed(() => currentSessionActiveOrders.value.length)

function isLegacyActive(order: Order): boolean {
	return isPendingStatus(order.status) && order.sessionId !== currentSessionId.value
}

const statusFilterOptions = computed<{ value: FilterStatus, label: string }[]>(() => [
	{ value: 'active', label: `対応中（${currentSessionActiveOrders.value.length}）` },
	{ value: 'legacy', label: `要確認（${legacyActiveOrders.value.length}）` },
	{ value: ORDER_STATUS.COMPLETED, label: ORDER_STATUS_LABELS[ORDER_STATUS.COMPLETED] },
	{ value: 'all', label: 'すべて' },
	{ value: ORDER_STATUS.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED] },
])

function sortActive(list: Order[]): Order[] {
	const rank: Record<OrderStatus, number> = {
		[ORDER_STATUS.COOKING]: 0,
		[ORDER_STATUS.RECEIVED]: 1,
		[ORDER_STATUS.COMPLETED]: 2,
		[ORDER_STATUS.CANCELLED]: 2,
	}
	return [...list].sort((a, b) => {
		const rankDiff = rank[a.status]! - rank[b.status]!
		if (rankDiff !== 0) return rankDiff
		return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
	})
}

const filteredOrders = computed(() => {
	if (filterStatus.value === 'all') return orders.value
	if (filterStatus.value === 'active') return sortActive(currentSessionActiveOrders.value)
	if (filterStatus.value === 'legacy') return sortActive(legacyActiveOrders.value)
	return orders.value.filter(o => o.status === filterStatus.value)
})

let unsubscribeShop: (() => void) | null = null
let unsubscribeOrders: (() => void) | null = null

onMounted(async () => {
	try {
		shop.value = await getShopById(shopId)
		// セッション未初期化（旧データ等）の店舗にセッションを発行する
		await ensureSession(shopId)
		error.value = ''
		// 会計（セッション切替）でも currentSessionId を即時反映するため shop 文書をライブ購読する。
		// これがないと会計後も currentSessionId が古いままで、新規注文が「旧セッション」と誤判定される
		unsubscribeShop = subscribeShop(shopId, (newShop) => {
			shop.value = newShop
		})
		unsubscribeOrders = subscribeOrders(shopId, (newOrders) => {
			orders.value = newOrders
		})
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '注文一覧の取得に失敗しました'
	}
})

onUnmounted(() => {
	unsubscribeShop?.()
	unsubscribeOrders?.()
})

function statusBadgeClass(status: OrderStatus) {
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

async function changeStatus(orderId: string, status: OrderStatus, cancelReasonValue?: string): Promise<boolean> {
	try {
		await updateOrderStatus(shopId, orderId, status, cancelReasonValue)
		return true
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : 'ステータス更新に失敗しました'
		return false
	}
}

function openCancelModal(order: Order) {
	cancelTarget.value = order
	cancelReason.value = ''
}

function closeCancelModal() {
	cancelTarget.value = null
	cancelReason.value = ''
}

async function confirmCancel() {
	if (!cancelTarget.value) return
	const target = cancelTarget.value
	const ok = await changeStatus(target.id, ORDER_STATUS.CANCELLED, cancelReason.value || undefined)
	if (ok) closeCancelModal()
}

function openCheckoutModal() {
	if (checkoutSubmitting.value) return
	error.value = ''
	success.value = ''
	checkoutConfirm.value = true
}

function closeCheckoutModal() {
	checkoutConfirm.value = false
}

async function confirmCheckout() {
	if (checkoutSubmitting.value) return
	checkoutSubmitting.value = true
	error.value = ''
	try {
		await startNewSession(shopId)
		checkoutConfirm.value = false
		success.value = '会計済みにしました。お客様の注文履歴は新しいセッションに切り替わりました。'
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '会計に失敗しました'
	}
	finally {
		checkoutSubmitting.value = false
	}
}

function openForceConfirm() {
	checkoutConfirm.value = false
	forceConfirm.value = true
}

function closeForceConfirm() {
	forceConfirm.value = false
}

async function confirmForce() {
	if (checkoutSubmitting.value) return
	checkoutSubmitting.value = true
	error.value = ''
	try {
		await forceEndSession(shopId)
		forceConfirm.value = false
		// 積み残しを可視化するため「要確認」タブへ切り替える
		filterStatus.value = 'legacy'
		success.value = '強制終了しました。未提供の注文は「要確認」に残っています。'
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '強制終了に失敗しました'
	}
	finally {
		checkoutSubmitting.value = false
	}
}
</script>
