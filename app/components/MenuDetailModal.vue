<template>
	<Teleport to="body">
		<Transition
			enter-active-class="transition-opacity duration-300 ease-out"
			enter-from-class="opacity-0"
			enter-to-class="opacity-100"
			leave-active-class="transition-opacity duration-200 ease-in"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<div
				v-if="menu"
				class="fixed inset-0 z-40 bg-black/40"
				@click="close"
			/>
		</Transition>

		<Transition
			enter-active-class="transition-transform duration-300 ease-out"
			enter-from-class="translate-y-full"
			enter-to-class="translate-y-0"
			leave-active-class="transition-transform duration-200 ease-in"
			leave-from-class="translate-y-0"
			leave-to-class="translate-y-full"
		>
			<div
				v-if="menu"
				role="dialog"
				aria-modal="true"
				aria-labelledby="menu-detail-title"
				class="fixed bottom-0 inset-x-0 z-50 mx-auto w-full max-w-lg rounded-t-3xl overflow-hidden bg-white shadow-2xl flex flex-col max-h-[92dvh]"
			>
				<div class="relative flex-shrink-0 w-full aspect-square max-h-[55dvh] overflow-hidden">
					<img
						v-if="menu.imageUrl"
						:src="getMenuImageUrl(menu)"
						:alt="menu.name"
						class="w-full h-full object-cover"
					>
					<div
						v-else
						class="w-full h-full flex items-center justify-center text-sm text-gray-400 bg-gray-100"
					>
						画像なし
					</div>
					<button
						type="button"
						aria-label="閉じる"
						class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white text-xl leading-none flex items-center justify-center hover:bg-black/70 transition"
						@click="close"
					>
						×
					</button>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto p-5">
					<h2
						id="menu-detail-title"
						class="text-xl font-bold text-gray-800"
					>
						{{ menu.name }}
					</h2>
					<p class="mt-1 text-lg font-bold text-gray-800">
						{{ formatPrice(menu.price) }}
					</p>
					<p
						v-if="menu.description"
						class="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line"
					>
						{{ menu.description }}
					</p>
				</div>

				<div class="flex-shrink-0 p-5 pt-0 border-t border-gray-100">
					<button
						v-if="canOrder && !menu.soldOut"
						type="button"
						class="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-sm hover:bg-blue-700 transition active:scale-[0.99]"
						@click="handleAdd(menu)"
					>
						＋ カートに追加
					</button>
					<div
						v-else-if="menu.soldOut"
						class="w-full rounded-xl py-4 text-center text-sm font-medium bg-gray-100 text-gray-500"
					>
						売り切れ
					</div>
					<div
						v-else
						class="w-full rounded-xl py-4 text-center text-sm bg-gray-100 text-gray-500"
					>
						現在、注文の受付を停止しています。
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { Menu } from '~/types'
import { formatPrice } from '~/utils/format'
import { getMenuImageUrl } from '~/utils/menuImage'

const props = defineProps<{
	menu: Menu | null
	canOrder: boolean
}>()

const emit = defineEmits<{
	close: []
	add: [menu: Menu]
}>()

const originalBodyOverflow = ref('')
const isScrollLocked = ref(false)

function lockScroll() {
	if (isScrollLocked.value) return
	originalBodyOverflow.value = document.body.style.overflow
	document.body.style.overflow = 'hidden'
	isScrollLocked.value = true
}

function unlockScroll() {
	if (!isScrollLocked.value) return
	document.body.style.overflow = originalBodyOverflow.value
	isScrollLocked.value = false
}

// menu === null になった時点でスクロールロックを解除する。
// 開いている間にコンポーネントが破棄された場合に備え、unmount でも確実に元の値へ復元する
watch(() => props.menu, (menu) => {
	if (menu) {
		lockScroll()
	}
	else {
		unlockScroll()
	}
})

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && props.menu) {
		close()
	}
}

onMounted(() => {
	window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown)
	unlockScroll()
})

function handleAdd(menu: Menu) {
	emit('add', menu)
}

function close() {
	emit('close')
}
</script>
