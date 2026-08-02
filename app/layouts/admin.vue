<template>
	<div class="min-h-screen bg-gray-100">
		<header class="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
					<NuxtLink
						to="/admin"
						class="font-bold text-lg text-gray-800 whitespace-nowrap"
					>
						Mobile Order
					</NuxtLink>
					<nav class="flex items-center gap-4 text-sm overflow-x-auto scrollbar-hidden">
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}`"
							class="text-gray-600 hover:text-gray-900 whitespace-nowrap"
						>
							注文
						</NuxtLink>
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}/menus`"
							class="text-gray-600 hover:text-gray-900 whitespace-nowrap"
						>
							メニュー
						</NuxtLink>
						<NuxtLink
							v-if="shopId"
							:to="`/admin/shops/${shopId}/settings`"
							class="text-gray-600 hover:text-gray-900 whitespace-nowrap"
						>
							設定
						</NuxtLink>
					</nav>
				</div>
				<div class="flex items-center gap-4 min-w-0">
					<span
						v-if="user?.email"
						class="hidden md:inline text-sm text-gray-500 truncate"
					>
						{{ user.email }}
					</span>
					<button
						class="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
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
