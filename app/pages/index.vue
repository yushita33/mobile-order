<template>
	<div class="min-h-screen flex items-center justify-center">
		<p class="text-gray-400">
			リダイレクトしています...
		</p>
	</div>
</template>

<script setup lang="ts">
onMounted(async () => {
	const user = await getCurrentUser()
	navigateTo(user ? '/admin' : '/login')
})
</script>
