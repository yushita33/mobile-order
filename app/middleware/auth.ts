export default defineNuxtRouteMiddleware(async (to) => {
	const user = await getCurrentUser()
	if (!user && to.path !== '/login') {
		return navigateTo({
			path: '/login',
			query: { redirect: to.fullPath },
		})
	}
})
