import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
	{
		files: ['**/*.{ts,tsx,mts,cts,vue}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'vue/define-macros-order': 'error',
			'vue/define-props-declaration': ['error', 'type-based'],
			'vue/define-emits-declaration': ['error', 'type-based'],
		},
	},
)
