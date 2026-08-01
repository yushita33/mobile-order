<template>
	<div class="min-h-screen bg-gray-100">
		<header class="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-6">
					<NuxtLink
						to="/admin"
						class="font-bold text-lg text-gray-800"
					>
						Mobile Order
					</NuxtLink>
					<nav class="flex items-center gap-4 text-sm">
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}`"
							class="text-gray-600 hover:text-gray-900"
						>
							注文
						</NuxtLink>
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}/menus`"
							class="text-gray-600 hover:text-gray-900"
						>
							メニュー
						</NuxtLink>
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}/settings`"
							class="text-gray-600 hover:text-gray-900"
						>
							設定
						</NuxtLink>
					</nav>
				</div>
				<div class="flex items-center gap-4">
					<span
						v-if="user?.email"
						class="text-sm text-gray-500"
					>
						{{ user.email }}
					</span>
					<button
						class="text-sm text-gray-600 hover:text-gray-900"
						@click="handleLogout"
					>
						ログアウト
					</button>
				</div>
			</div>
		</header>

		<main class="max-w-6xl mx-auto px-4 py-6">
			<slot />
		</main>
	</div>
</template>

<script setup lang="ts">
const route = useRoute()
const user = useCurrentUser()
const { signOut: signOutUser } = useAuthActions()

const shopId = computed(() => {
	const match = route.path.match(/^\/admin\/shops\/([^/]+)/)
	return match ? match[1] : null
})

async function handleLogout() {
	await signOutUser()
	navigateTo('/login')
}
</script>
