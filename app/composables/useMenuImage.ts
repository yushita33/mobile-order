import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export interface UploadedImage {
	imageUrl: string
	storagePath: string
	imageUpdatedAt: number
}

export const IMAGE_MAX_SIZE = 1024
export const IMAGE_QUALITY = 0.8
export const IMAGE_MIME_TYPE = 'image/webp'
export const IMAGE_EXT = 'webp'

export function useMenuImage() {
	const storage = useFirebaseStorage()

	// トリミング済み Canvas をリサイズ・圧縮して Blob に変換する
	function processMenuImage(canvas: HTMLCanvasElement): Promise<Blob> {
		const scale = Math.min(1, IMAGE_MAX_SIZE / Math.max(canvas.width, canvas.height))
		const resized = document.createElement('canvas')
		resized.width = Math.round(canvas.width * scale)
		resized.height = Math.round(canvas.height * scale)
		const ctx = resized.getContext('2d')!
		ctx.drawImage(canvas, 0, 0, resized.width, resized.height)
		return new Promise((resolve, reject) => {
			resized.toBlob((blob) => {
				if (blob) resolve(blob)
				else reject(new Error('画像の変換に失敗しました'))
			}, IMAGE_MIME_TYPE, IMAGE_QUALITY)
		})
	}

	async function uploadMenuImage(
		shopId: string,
		menuId: string,
		blob: Blob,
	): Promise<UploadedImage> {
		const storagePath = `shops/${shopId}/menus/${menuId}.${IMAGE_EXT}`
		const fileRef = ref(storage, storagePath)
		await uploadBytes(fileRef, blob)
		const imageUrl = await getDownloadURL(fileRef)
		return { imageUrl, storagePath, imageUpdatedAt: Date.now() }
	}

	async function deleteMenuImage(storagePath: string) {
		await deleteObject(ref(storage, storagePath))
	}

	return { uploadMenuImage, deleteMenuImage, processMenuImage }
}
