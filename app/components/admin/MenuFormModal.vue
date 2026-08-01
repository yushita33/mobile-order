<template>
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		@click.self="close"
	>
		<div class="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
				<h2 class="font-bold text-gray-800">
					{{ isEdit ? 'メニューを編集' : 'メニューを追加' }}
				</h2>
				<button
					class="text-gray-400 hover:text-gray-600 text-xl leading-none"
					@click="close"
				>
					×
				</button>
			</div>

			<form
				class="p-6 space-y-4"
				@submit.prevent="submit"
			>
				<label class="block">
					<span class="text-sm font-medium text-gray-700">メニュー名 *</span>
					<input
						v-model="form.name"
						type="text"
						required
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="text-sm font-medium text-gray-700">価格（円）*</span>
						<input
							v-model.number="form.price"
							type="number"
							min="1"
							step="1"
							required
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-gray-700">表示順</span>
						<input
							v-model.number="form.sortOrder"
							type="number"
							step="10"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
					</label>
				</div>

				<label class="block">
					<span class="text-sm font-medium text-gray-700">メニューグループ</span>
					<select
						v-model="form.menuGroupId"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">グループなし</option>
						<option
							v-for="g in groups"
							:key="g.id"
							:value="g.id"
						>
							{{ g.name }}
						</option>
					</select>
				</label>

				<label class="block">
					<span class="text-sm font-medium text-gray-700">説明</span>
					<textarea
						v-model="form.description"
						rows="2"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<div>
					<span class="text-sm font-medium text-gray-700">画像</span>
					<img
						v-if="previewImageUrl"
						:src="previewImageUrl"
						alt="menu image"
						class="mt-2 w-32 h-32 object-cover rounded-lg border border-gray-200"
					>
					<input
						type="file"
						accept="image/*"
						class="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
						@change="onFileChange"
					>
				</div>

				<div class="flex gap-6">
					<label class="flex items-center gap-2 text-sm text-gray-700">
						<input
							v-model="form.isVisible"
							type="checkbox"
							class="rounded"
						>
						表示する
					</label>
					<label class="flex items-center gap-2 text-sm text-gray-700">
						<input
							v-model="form.soldOut"
							type="checkbox"
							class="rounded"
						>
						売り切れ
					</label>
				</div>

				<p
					v-if="error"
					class="text-sm text-red-600 bg-red-50 rounded p-3"
				>
					{{ error }}
				</p>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
						@click="close"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
						:disabled="loading"
					>
						{{ loading ? '保存中...' : '保存' }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Menu, MenuGroup } from '~/types'

const props = defineProps<{
	menu: Menu | null
	groups: MenuGroup[]
	shopId: string
}>()

const emit = defineEmits<{
	close: []
	saved: []
}>()

const { addMenu, updateMenu } = useMenus()
const { uploadMenuImage, deleteMenuImage } = useMenuImage()

const isEdit = computed(() => props.menu !== null)

const form = reactive({
	name: '',
	price: 1,
	sortOrder: 10,
	menuGroupId: '',
	description: '',
	isVisible: true,
	soldOut: false,
})

const selectedFile = ref<File | null>(null)
const previewImageUrl = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
	if (props.menu) {
		form.name = props.menu.name
		form.price = props.menu.price
		form.sortOrder = props.menu.sortOrder
		form.menuGroupId = props.menu.menuGroupId ?? ''
		form.description = props.menu.description ?? ''
		form.isVisible = props.menu.isVisible
		form.soldOut = props.menu.soldOut
		previewImageUrl.value = props.menu.imageUrl ?? ''
	}
})

function onFileChange(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	selectedFile.value = file
	previewImageUrl.value = URL.createObjectURL(file)
}

async function submit() {
	loading.value = true
	error.value = ''
	try {
		const menuGroupId = form.menuGroupId || undefined
		if (isEdit.value && props.menu) {
			const data: Partial<Menu> = {
				name: form.name,
				price: form.price,
				sortOrder: form.sortOrder,
				menuGroupId,
				description: form.description,
				isVisible: form.isVisible,
				soldOut: form.soldOut,
			}
			const priceChanged = form.price !== props.menu.price
			if (priceChanged) {
				data.version = props.menu.version + 1
			}
			if (selectedFile.value) {
				const uploaded = await uploadMenuImage(props.shopId, props.menu.id, selectedFile.value)
				data.imageUrl = uploaded.imageUrl
				data.storagePath = uploaded.storagePath
				data.imageUpdatedAt = uploaded.imageUpdatedAt
				if (props.menu.storagePath) {
					await deleteMenuImage(props.menu.storagePath).catch(() => {})
				}
			}
			await updateMenu(props.shopId, props.menu.id, data)
		}
		else {
			const menuId = await addMenu(props.shopId, {
				name: form.name,
				price: form.price,
				sortOrder: form.sortOrder,
				menuGroupId,
				description: form.description,
				isVisible: form.isVisible,
				soldOut: form.soldOut,
			})
			if (selectedFile.value) {
				const uploaded = await uploadMenuImage(props.shopId, menuId, selectedFile.value)
				await updateMenu(props.shopId, menuId, {
					imageUrl: uploaded.imageUrl,
					storagePath: uploaded.storagePath,
					imageUpdatedAt: uploaded.imageUpdatedAt,
				})
			}
		}
		emit('saved')
		close()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '保存に失敗しました'
	}
	finally {
		loading.value = false
	}
}

function close() {
	emit('close')
}
</script>
