import {
	collection,
	doc,
	setDoc,
	updateDoc,
	deleteDoc,
	getDocs,
	query,
	where,
	orderBy,
} from 'firebase/firestore'
import type { Menu, MenuGroup } from '~/types'

export function useMenus() {
	const db = useDb()

	async function getMenuGroups(shopId: string): Promise<MenuGroup[]> {
		const snap = await getDocs(
			query(
				collection(db, 'shops', shopId, 'menuGroups'),
				orderBy('sortOrder', 'asc'),
			),
		)
		return snap.docs.map(d => ({ id: d.id, ...d.data() }) as MenuGroup)
	}

	async function addMenuGroup(
		shopId: string,
		name: string,
		sortOrder: number,
	): Promise<string> {
		const groupRef = doc(collection(db, 'shops', shopId, 'menuGroups'))
		await setDoc(groupRef, { name, sortOrder })
		return groupRef.id
	}

	async function updateMenuGroup(
		shopId: string,
		groupId: string,
		data: Partial<MenuGroup>,
	) {
		await updateDoc(doc(db, 'shops', shopId, 'menuGroups', groupId), data)
	}

	async function deleteMenuGroup(shopId: string, groupId: string) {
		const menus = await getMenusByGroup(shopId, groupId)
		if (menus.length > 0) {
			throw new Error('このグループにはメニューが存在するため削除できません')
		}
		await deleteDoc(doc(db, 'shops', shopId, 'menuGroups', groupId))
	}

	async function getMenusByGroup(shopId: string, groupId: string): Promise<Menu[]> {
		const snap = await getDocs(
			query(
				collection(db, 'shops', shopId, 'menus'),
				where('menuGroupId', '==', groupId),
			),
		)
		return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Menu)
	}

	async function getMenus(shopId: string): Promise<Menu[]> {
		const snap = await getDocs(
			query(
				collection(db, 'shops', shopId, 'menus'),
				orderBy('sortOrder', 'asc'),
			),
		)
		return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Menu)
	}

	async function addMenu(
		shopId: string,
		data: Omit<Menu, 'id' | 'version'>,
	): Promise<string> {
		const menuRef = doc(collection(db, 'shops', shopId, 'menus'))
		await setDoc(menuRef, { ...data, version: 1 })
		return menuRef.id
	}

	async function updateMenu(shopId: string, menuId: string, data: Partial<Menu>) {
		await updateDoc(doc(db, 'shops', shopId, 'menus', menuId), data)
	}

	async function deleteMenu(shopId: string, menuId: string) {
		await deleteDoc(doc(db, 'shops', shopId, 'menus', menuId))
	}

	return {
		getMenuGroups,
		addMenuGroup,
		updateMenuGroup,
		deleteMenuGroup,
		getMenusByGroup,
		getMenus,
		addMenu,
		updateMenu,
		deleteMenu,
	}
}
