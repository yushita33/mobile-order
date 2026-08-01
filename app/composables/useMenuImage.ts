import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export interface UploadedImage {
	imageUrl: string
	storagePath: string
	imageUpdatedAt: number
}

export function useMenuImage() {
	const storage = useFirebaseStorage()

	async function uploadMenuImage(
		shopId: string,
		menuId: string,
		file: File,
	): Promise<UploadedImage> {
		const ext = file.name.split('.').pop() || 'jpg'
		const storagePath = `shops/${shopId}/menus/${menuId}.${ext}`
		const fileRef = ref(storage, storagePath)
		await uploadBytes(fileRef, file)
		const imageUrl = await getDownloadURL(fileRef)
		return { imageUrl, storagePath, imageUpdatedAt: Date.now() }
	}

	async function deleteMenuImage(storagePath: string) {
		await deleteObject(ref(storage, storagePath))
	}

	return { uploadMenuImage, deleteMenuImage }
}
