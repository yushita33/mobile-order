<template>
	<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
		<div class="bg-white p-8 rounded-xl shadow-sm w-full max-w-sm">
			<h1 class="text-2xl font-bold text-center text-gray-800 mb-2">
				Mobile Order
			</h1>
			<p class="text-center text-sm text-gray-500 mb-8">
				モバイルオーダー管理画面
			</p>

			<p
				v-if="error"
				class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
			>
				{{ error }}
			</p>

			<p
				v-if="isInAppBrowser"
				class="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3"
			>
				LINEなどのアプリ内ブラウザではGoogleログインが正常に動作しない場合があります。
				メニューから「ブラウザで開く」を選択して再度お試しください。
			</p>

			<button
				class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
				:disabled="loading"
				@click="handleLogin"
			>
				<svg
					class="w-5 h-5"
					viewBox="0 0 24 24"
				>
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52Z"
					/>
				</svg>
				{{ loading ? 'ログイン中...' : 'Google でログイン' }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const route = useRoute()
const { signInWithGoogle } = useAuthActions()
const { ensureUserProfile } = useUserProfile()

const loading = ref(false)
const error = ref('')

const isInAppBrowser = computed(() => detectInAppBrowser())

function detectInAppBrowser(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent.toLowerCase()
	const appMarkers = ['line/', 'instagram', 'fbav', 'fban', 'twitter', 'tiktok', 'kakaotalk']
	if (appMarkers.some(m => ua.includes(m))) return true
	if (ua.includes('wv')) return true
	const isIos = /iphone|ipad|ipod/.test(ua)
	const isNormalBrowser = /safari|crios|fxios|edgios|opios/.test(ua)
	return isIos && !isNormalBrowser
}

async function handleLogin() {
	loading.value = true
	error.value = ''
	try {
		await signInWithGoogle()
		const user = await getCurrentUser()
		if (user) {
			await ensureUserProfile(user)
		}
		const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
		navigateTo(redirect)
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : 'ログインに失敗しました'
	}
	finally {
		loading.value = false
	}
}
</script>
