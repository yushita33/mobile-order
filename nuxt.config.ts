import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

	modules: ['@pinia/nuxt', 'nuxt-vuefire', '@nuxt/eslint'],

	ssr: false,
	devtools: { enabled: false },

	css: ['~/assets/css/main.css'],
	compatibilityDate: '2025-07-15',

	vite: {
		plugins: [tailwindcss()],
	},

	eslint: {
		config: {
			stylistic: {
				indent: 'tab',
				quotes: 'single',
				semi: false,
			},
		},
	},

	vuefire: {
		auth: { enabled: true },
		config: {
			apiKey: process.env.FIREBASE_API_KEY ?? '',
			authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
			projectId: process.env.FIREBASE_PROJECT_ID ?? '',
			appId: process.env.FIREBASE_APP_ID ?? '',
			storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
			messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
		},
	},
})
