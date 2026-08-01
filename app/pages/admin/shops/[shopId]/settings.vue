<template>
	<div>
		<h1 class="text-xl font-bold text-gray-800 mb-6">
			店舗設定
		</h1>

		<p
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</p>
		<p
			v-if="success"
			class="mb-4 text-sm text-green-700 bg-green-50 rounded p-3"
		>
			保存しました
		</p>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<form
				class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
				@submit.prevent="saveShop"
			>
				<h2 class="font-bold text-gray-800 mb-4">
					店舗情報
				</h2>

				<label class="block mb-4">
					<span class="text-sm font-medium text-gray-700">店舗名</span>
					<input
						v-model="shopForm.name"
						type="text"
						required
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
				</label>

				<label class="block mb-4">
					<span class="text-sm font-medium text-gray-700">説明</span>
					<textarea
						v-model="shopForm.description"
						rows="3"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label class="block mb-4">
					<span class="text-sm font-medium text-gray-700">注文URL</span>
					<div class="mt-1 flex items-center gap-2">
						<input
							:value="shop ? `/order/${shop.publicId}` : ''"
							type="text"
							readonly
							class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
						>
						<button
							type="button"
							class="text-sm text-blue-600 hover:text-blue-800"
							@click="copyOrderUrl"
						>
							コピー
						</button>
					</div>
				</label>

				<button
					type="submit"
					class="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition disabled:opacity-50"
					:disabled="saving"
				>
					{{ saving ? '保存中...' : '保存' }}
				</button>
			</form>

			<form
				class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
				@submit.prevent="saveSettings"
			>
				<h2 class="font-bold text-gray-800 mb-4">
					店舗設定
				</h2>

				<label class="flex items-center justify-between mb-4">
					<span class="text-sm font-medium text-gray-700">営業中（注文受付）</span>
					<input
						v-model="settingsForm.isOpen"
						type="checkbox"
						class="w-5 h-5 rounded"
					>
				</label>

				<div class="grid grid-cols-2 gap-4 mb-4">
					<label class="block">
						<span class="text-sm font-medium text-gray-700">税率（%）</span>
						<input
							v-model.number="settingsForm.taxRate"
							type="number"
							min="0"
							step="0.1"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-gray-700">通貨</span>
						<input
							v-model="settingsForm.currency"
							type="text"
							placeholder="JPY"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
					</label>
				</div>

				<label class="block mb-4">
					<span class="text-sm font-medium text-gray-700">注文受付メッセージ</span>
					<textarea
						v-model="settingsForm.receiptMessage"
						rows="2"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<button
					type="submit"
					class="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition disabled:opacity-50"
					:disabled="saving"
				>
					{{ saving ? '保存中...' : '保存' }}
				</button>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Shop, ShopSettings } from '~/types'

definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const route = useRoute()
const shopId = String(route.params.shopId)

const { getShopById, updateShop, getSettings, updateSettings } = useShops()

const shop = ref<Shop | null>(null)
const shopForm = reactive({ name: '', description: '' })
const settingsForm = reactive({
	isOpen: true,
	taxRate: 0,
	currency: 'JPY',
	receiptMessage: '',
})
const saving = ref(false)
const error = ref('')
const success = ref(false)

onMounted(async () => {
	try {
		const [s, settings] = await Promise.all([getShopById(shopId), getSettings(shopId)])
		shop.value = s
		if (s) {
			shopForm.name = s.name
			shopForm.description = s.description ?? ''
		}
		if (settings) {
			settingsForm.isOpen = settings.isOpen
			settingsForm.taxRate = settings.taxRate
			settingsForm.currency = settings.currency
			settingsForm.receiptMessage = settings.receiptMessage ?? ''
		}
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
	}
})

async function saveShop() {
	saving.value = true
	error.value = ''
	success.value = false
	try {
		await updateShop(shopId, { name: shopForm.name, description: shopForm.description })
		success.value = true
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '保存に失敗しました'
	}
	finally {
		saving.value = false
	}
}

async function saveSettings() {
	saving.value = true
	error.value = ''
	success.value = false
	try {
		const data: ShopSettings = {
			isOpen: settingsForm.isOpen,
			taxRate: settingsForm.taxRate,
			currency: settingsForm.currency,
			receiptMessage: settingsForm.receiptMessage,
		}
		await updateSettings(shopId, data)
		success.value = true
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '保存に失敗しました'
	}
	finally {
		saving.value = false
	}
}

async function copyOrderUrl() {
	if (!shop.value) return
	const url = `${window.location.origin}/order/${shop.value.publicId}`
	try {
		await navigator.clipboard.writeText(url)
		success.value = true
	}
	catch {
		error.value = 'コピーに失敗しました'
	}
}
</script>
