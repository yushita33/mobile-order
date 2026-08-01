<template>
	<div class="max-w-md mx-auto">
		<h1 class="text-xl font-bold text-gray-800 mb-6">
			店舗を登録
		</h1>

		<p
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</p>

		<form
			class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
			@submit.prevent="handleCreate"
		>
			<label class="block mb-4">
				<span class="text-sm font-medium text-gray-700">店舗名</span>
				<input
					v-model="name"
					type="text"
					required
					placeholder="例: カフェ山田"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
			</label>

			<button
				type="submit"
				class="w-full bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition disabled:opacity-50"
				:disabled="loading"
			>
				{{ loading ? '登録中...' : '登録する' }}
			</button>
		</form>

		<NuxtLink
			to="/admin"
			class="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
		>
			戻る
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const { createShop } = useShops()
const user = useCurrentUser()

const name = ref('')
const loading = ref(false)
const error = ref('')

async function handleCreate() {
	if (!name.value.trim()) return
	loading.value = true
	error.value = ''
	try {
		const uid = user.value?.uid
		if (!uid) throw new Error('ログイン情報を取得できませんでした')
		const { shopId } = await createShop(uid, name.value.trim())
		navigateTo(`/admin/shops/${shopId}`)
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '店舗の登録に失敗しました'
	}
	finally {
		loading.value = false
	}
}
</script>
