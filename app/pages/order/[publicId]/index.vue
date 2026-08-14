<template>
	<div class="max-w-lg mx-auto px-4 pb-28">
		<div
			v-if="shop"
			class="py-6"
		>
			<div class="flex items-center justify-between gap-3 mb-4">
				<div class="flex items-center gap-3 min-w-0">
					<img
						v-if="shop.logoUrl"
						:src="shop.logoUrl"
						alt="logo"
						class="w-12 h-12 rounded-full object-cover flex-shrink-0"
					>
					<div class="min-w-0">
						<h1 class="text-2xl font-bold text-gray-800">
							{{ shop.name }}
						</h1>
						<p
							v-if="shop.description"
							class="text-sm text-gray-500"
						>
							{{ shop.description }}
						</p>
					</div>
				</div>
				<NuxtLink
					:to="`/order/${route.params.publicId}/history`"
					class="flex-shrink-0 text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
				>
					注文履歴
				</NuxtLink>
			</div>

			<div
				v-if="settings && !settings.isOpen"
				class="mb-4 bg-amber-50 text-amber-700 text-sm rounded-lg p-3"
			>
				現在、注文の受付を停止しています。
			</div>
			<div
				v-if="settings?.receiptMessage"
				class="mb-4 bg-blue-50 text-blue-700 text-sm rounded-lg p-3"
			>
				{{ settings.receiptMessage }}
			</div>
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
			v-else-if="shop"
			class="space-y-8"
		>
			<div
				v-for="group in groupsWithMenus"
				:key="group.id"
			>
				<h2 class="font-bold text-gray-800 text-lg mb-3 border-b border-gray-200 pb-2">
					{{ group.name }}
				</h2>
				<div class="space-y-3">
					<div
						v-for="menu in group.menus"
						:key="menu.id"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-4"
					>
						<img
							v-if="menu.imageUrl"
							:src="menu.imageUrl + (menu.imageUpdatedAt ? `?v=${menu.imageUpdatedAt}` : '')"
							:alt="menu.name"
							class="w-20 h-20 object-cover rounded-lg flex-shrink-0"
						>
						<div
							v-else
							class="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs flex-shrink-0"
						>
							画像なし
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-gray-800">
								{{ menu.name }}
							</p>
							<p class="text-gray-600 text-sm mt-0.5">
								{{ formatPrice(menu.price) }}
							</p>
							<p
								v-if="menu.description"
								class="text-gray-400 text-xs mt-1"
							>
								{{ menu.description }}
							</p>
							<button
								v-if="!menu.soldOut && canOrder"
								class="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
								@click="addToCart(menu)"
							>
								＋ カートに追加
							</button>
							<span
								v-else-if="menu.soldOut"
								class="inline-block mt-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5"
							>
								売り切れ
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="cart.items.length > 0 && shop && canOrder"
			class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg"
		>
			<button
				class="w-full bg-blue-600 text-white rounded-xl py-4 flex items-center justify-between px-6 shadow-lg hover:bg-blue-700 transition"
				@click="navigateTo(`/order/${route.params.publicId}/cart`)"
			>
				<span class="font-bold">{{ cart.count }} 点</span>
				<span class="text-sm">カートを見る</span>
				<span class="font-bold">{{ formatPrice(cart.total) }}</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Menu, MenuGroup, Shop, ShopSettings } from '~/types'
import { formatPrice } from '~/utils/format'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const publicId = String(route.params.publicId)

const { getShopByPublicId, getSettings } = useShops()
const { getMenuGroups, getMenus } = useMenus()
const { ensureGuestUid } = useCustomer()

const cart = useCartStore()

const shop = ref<Shop | null>(null)
const settings = ref<ShopSettings | null>(null)
const groups = ref<MenuGroup[]>([])
const menus = ref<Menu[]>([])
const loading = ref(true)
const error = ref('')

const canOrder = computed(() => settings.value?.isOpen ?? false)

const groupsWithMenus = computed(() => {
	return groups.value.map(group => ({
		...group,
		menus: menus.value
			.filter(m => m.menuGroupId === group.id && m.isVisible)
			.sort((a, b) => a.sortOrder - b.sortOrder),
	}))
})

onMounted(async () => {
	cart.load()
	// 注文・履歴を利用できるよう、先に認証（匿名）を済ませておく。
	// 認証に失敗してもメニュー閲覧は継続する（注文確定時にカート画面で再認証される）
	try {
		await ensureGuestUid()
	}
	catch {
		// メニュー閲覧は継続
	}
	try {
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
		const [st, g, m] = await Promise.all([
			getSettings(s.id),
			getMenuGroups(s.id),
			getMenus(s.id),
		])
		settings.value = st
		groups.value = g
		menus.value = m
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
	}
	finally {
		loading.value = false
	}
})

function addToCart(menu: Menu) {
	cart.addItem({
		menuId: menu.id,
		name: menu.name,
		price: menu.price,
		qty: 1,
		menuVersion: menu.version,
	})
}
</script>
