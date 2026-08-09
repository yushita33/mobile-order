<template>
	<div class="inline-flex items-center justify-center">
		<img
			v-if="dataUrl"
			:src="dataUrl"
			:width="size"
			:height="size"
			alt="注文ページのQRコード"
			class="rounded"
		>
		<div
			v-else-if="error"
			:style="{ width: `${size}px`, height: `${size}px` }"
			class="flex items-center justify-center text-xs text-red-500 bg-gray-50 rounded"
		>
			QRコードを生成できませんでした
		</div>
		<div
			v-else
			:style="{ width: `${size}px`, height: `${size}px` }"
			class="flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded"
		>
			読み込み中...
		</div>
	</div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{
	value: string
	size?: number
}>(), {
	size: 160,
})

const dataUrl = ref('')
const error = ref(false)

watch(
	() => props.value,
	async (val) => {
		dataUrl.value = ''
		error.value = false
		if (!val) return
		try {
			dataUrl.value = await QRCode.toDataURL(val, {
				width: props.size,
				margin: 1,
				errorCorrectionLevel: 'M',
			})
		}
		catch {
			error.value = true
		}
	},
	{ immediate: true },
)
</script>
