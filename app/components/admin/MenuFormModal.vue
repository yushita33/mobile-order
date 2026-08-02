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
							min="0"
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

	<div
		v-if="cropStage"
		class="fixed inset-0 z-[60] flex flex-col bg-black"
	>
		<div class="flex items-center justify-between px-4 py-3 text-white shrink-0">
			<button
				type="button"
				class="text-sm"
				@click="cancelCrop"
			>
				キャンセル
			</button>
			<span class="text-sm">画像の位置を調整</span>
			<button
				type="button"
				class="text-sm font-bold text-blue-400 disabled:opacity-50"
				:disabled="processing"
				@click="confirmCrop"
			>
				{{ processing ? '処理中...' : '確定' }}
			</button>
		</div>
		<div class="flex-1 min-h-0">
			<img
				ref="cropImg"
				:src="cropPreviewUrl"
				alt="トリミング対象"
				class="w-full h-full object-contain"
			>
		</div>
		<div class="shrink-0 py-2 text-center text-xs text-white/60">
			ドラッグで位置調整 / 拡大縮小できます
		</div>
	</div>
</template>

<script setup lang="ts">
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { IMAGE_MAX_SIZE } from '~/composables/useMenuImage'
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
const { uploadMenuImage, deleteMenuImage, processMenuImage } = useMenuImage()

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

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

const processedBlob = ref<Blob | null>(null)
const previewImageUrl = ref('')
const loading = ref(false)
const error = ref('')

const cropStage = ref(false)
const processing = ref(false)
const cropPreviewUrl = ref('')
const cropImg = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

onBeforeUnmount(() => {
	destroyCropper()
	if (cropPreviewUrl.value) {
		URL.revokeObjectURL(cropPreviewUrl.value)
	}
	if (previewImageUrl.value.startsWith('blob:')) {
		URL.revokeObjectURL(previewImageUrl.value)
	}
})

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

async function onFileChange(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	if (file.size > MAX_UPLOAD_SIZE) {
		error.value = '画像が大きすぎます(10MB以下にしてください)'
		input.value = ''
		return
	}
	error.value = ''
	const url = URL.createObjectURL(file)
	try {
		await loadImage(url)
	}
	catch {
		error.value = 'この画像形式には対応していません'
		URL.revokeObjectURL(url)
		input.value = ''
		return
	}
	processedBlob.value = null
	cropPreviewUrl.value = url
	cropStage.value = true
	await nextTick()
	initCropper()
}
function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error('decode failed'))
		img.src = src
	})
}

function initCropper() {
	if (!cropImg.value) return
	cropper = new Cropper(cropImg.value, {
		aspectRatio: 1,
		autoCropArea: 1,
		viewMode: 1,
		guides: true,
		background: true,
		responsive: true,
		dragMode: 'move',
		cropBoxMovable: false,
		cropBoxResizable: false,
	})
}

function destroyCropper() {
	if (cropper) {
		cropper.destroy()
		cropper = null
	}
}

async function confirmCrop() {
	if (!cropper) return
	processing.value = true
	try {
		const imageData = cropper.getImageData()
		const box = cropper.getCropBoxData()
		const naturalCropSize = Math.round(box.width * imageData.naturalWidth / imageData.width)
		const size = Math.min(IMAGE_MAX_SIZE, Math.max(1, naturalCropSize))
		const canvas = cropper.getCroppedCanvas({
			width: size,
			height: size,
			imageSmoothingQuality: 'high',
		})
		processedBlob.value = await processMenuImage(canvas)
		previewImageUrl.value = URL.createObjectURL(processedBlob.value)
		closeCrop()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '画像の処理に失敗しました'
	}
	finally {
		processing.value = false
	}
}

function cancelCrop() {
	closeCrop()
	processedBlob.value = null
	previewImageUrl.value = props.menu?.imageUrl ?? ''
	error.value = ''
}

function closeCrop() {
	cropStage.value = false
	if (cropPreviewUrl.value) {
		URL.revokeObjectURL(cropPreviewUrl.value)
		cropPreviewUrl.value = ''
	}
	destroyCropper()
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
			if (processedBlob.value) {
				const uploaded = await uploadMenuImage(props.shopId, props.menu.id, processedBlob.value)
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
			if (processedBlob.value) {
				const uploaded = await uploadMenuImage(props.shopId, menuId, processedBlob.value)
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
	destroyCropper()
	if (previewImageUrl.value.startsWith('blob:')) {
		URL.revokeObjectURL(previewImageUrl.value)
	}
	emit('close')
}
</script>
