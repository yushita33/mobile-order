<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script setup lang="ts">
const router = useRouter()
const user = useCurrentUser()

onMounted(() => {
	watch(user, (newUser, prevUser) => {
		if (prevUser && !newUser) {
			router.push('/login')
		}
	})
})
</script>
