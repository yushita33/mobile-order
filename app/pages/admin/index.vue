<template>
	<div>
		<div class="flex flex-wrap items-center justify-between gap-2 mb-6">
			<h1 class="text-xl font-bold text-gray-800">
				店舗一覧
			</h1>
			<NuxtLink
				to="/admin/shops/new"
				class="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition whitespace-nowrap"
			>
				店舗を登録
			</NuxtLink>
		</div>

		<p
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</p>

		<div
			v-if="loading"
			class="text-gray-500 py-8 text-center"
		>
			読み込み中...
		</div>

		<div
			v-else-if="shops.length === 0"
			class="bg-white rounded-xl p-10 text-center shadow-sm"
		>
			<p class="text-gray-600 mb-4">
				まだ店舗が登録されていません。
			</p>
			<NuxtLink
				to="/admin/shops/new"
				class="inline-block bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition"
			>
				最初の店舗を登録する
			</NuxtLink>
		</div>

		<div
			v-else
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
		>
			<NuxtLink
				v-for="shop in shops"
				:key="shop.id"
				:to="`/admin/shops/${shop.id}`"
				class="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition border border-gray-200"
			>
				<h2 class="font-bold text-gray-800 mb-1">{{ shop.name }}</h2>
				<p class="text-sm text-gray-500 mb-3">
					注文URL: /order/{{ shop.publicId }}
				</p>
				<div class="flex items-center gap-2">
					<span class="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
						注文一覧へ
					</span>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const { getShopsByOwner } = useShops()
const user = useCurrentUser()
const shops = ref<Awaited<ReturnType<typeof getShopsByOwner>>>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
	try {
		const uid = user.value?.uid
		if (uid) {
			shops.value = await getShopsByOwner(uid)
		}
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '店舗一覧の取得に失敗しました'
	}
	finally {
		loading.value = false
	}
})
</script>
