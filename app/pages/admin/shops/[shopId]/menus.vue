<template>
	<div>
		<h1 class="text-xl font-bold text-gray-800 mb-6">
			メニュー管理
		</h1>

		<p
			v-if="error"
			class="mb-4 text-sm text-red-600 bg-red-50 rounded p-3"
		>
			{{ error }}
		</p>

		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
			<h2 class="font-bold text-gray-800 mb-3">
				メニューグループ
			</h2>

			<VueDraggable
				v-model="groups"
				tag="ul"
				:animation="150"
				handle=".drag-handle"
				ghost-class="opacity-40"
				:touch-start-threshold="5"
				:delay="150"
				:delay-on-touch-only="true"
				class="space-y-2 mb-4"
				@start="onGroupStart"
				@end="onGroupEnd"
			>
				<li
					v-for="group in groups"
					:key="group.id"
					class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border border-gray-200 rounded-lg px-3 py-2"
				>
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<button
							type="button"
							class="drag-handle flex-shrink-0 p-1 text-gray-400 rounded cursor-grab active:cursor-grabbing touch-none"
							aria-label="並べ替え"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<circle
									cx="5"
									cy="4"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="4"
									r="1.5"
								/>
								<circle
									cx="5"
									cy="8"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="8"
									r="1.5"
								/>
								<circle
									cx="5"
									cy="12"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="12"
									r="1.5"
								/>
							</svg>
						</button>
						<input
							v-model="group.name"
							class="text-sm border border-transparent focus:border-gray-300 focus:outline-none rounded px-1 py-0.5 min-w-0 flex-1"
							@change="saveGroup(group)"
						>
					</div>
					<button
						class="text-xs text-red-600 hover:text-red-800 whitespace-nowrap"
						@click="removeGroup(group)"
					>
						削除
					</button>
				</li>
			</VueDraggable>

			<form
				class="flex gap-2"
				@submit.prevent="addGroup"
			>
				<input
					v-model="newGroupName"
					type="text"
					placeholder="新しいグループ名"
					class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
				<button
					type="submit"
					class="bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap flex-shrink-0"
					:disabled="!newGroupName.trim()"
				>
					追加
				</button>
			</form>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2 mb-4">
			<h2 class="font-bold text-gray-800">
				メニュー一覧
			</h2>
			<button
				class="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition whitespace-nowrap"
				@click="openModal(null)"
			>
				+ メニューを追加
			</button>
		</div>

		<div
			v-if="menus.length === 0"
			class="bg-white rounded-xl p-10 text-center shadow-sm"
		>
			<p class="text-gray-500">
				メニューがありません。追加してください。
			</p>
		</div>

		<div
			v-for="group in groups"
			:key="group.id"
			class="mb-6"
		>
			<h3 class="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">
				{{ group.name }}
			</h3>
			<VueDraggable
				:model-value="getMenuList(group.id)"
				:disabled="reorderingMenuGroupId !== null"
				:animation="150"
				handle=".drag-handle"
				ghost-class="opacity-40"
				:touch-start-threshold="5"
				:delay="150"
				:delay-on-touch-only="true"
				class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
				@update:model-value="(value: Menu[]) => onMenuUpdate(group.id, value)"
				@start="() => onMenuStart(group.id)"
				@end="() => onMenuEnd(group.id)"
			>
				<div
					v-for="menu in getMenuList(group.id)"
					:key="menu.id"
					class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="flex gap-3 min-w-0 flex-1">
							<img
								v-if="menu.imageUrl"
								:src="menu.imageUrl + (menu.imageUpdatedAt ? `?v=${menu.imageUpdatedAt}` : '')"
								:alt="menu.name"
								class="w-20 h-20 object-cover rounded-lg flex-shrink-0"
							>
							<div
								v-else
								class="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs flex-shrink-0"
							>
								画像なし
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-medium text-gray-800 text-sm">
									{{ menu.name }}
								</p>
								<p class="text-gray-600 text-sm">
									{{ formatPrice(menu.price) }}
								</p>
								<p
									v-if="menu.description"
									class="text-gray-400 text-xs mt-1 line-clamp-2"
								>
									{{ menu.description }}
								</p>
							</div>
						</div>
						<button
							type="button"
							class="drag-handle flex-shrink-0 p-1 text-gray-400 rounded cursor-grab active:cursor-grabbing touch-none"
							aria-label="並べ替え"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<circle
									cx="5"
									cy="4"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="4"
									r="1.5"
								/>
								<circle
									cx="5"
									cy="8"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="8"
									r="1.5"
								/>
								<circle
									cx="5"
									cy="12"
									r="1.5"
								/>
								<circle
									cx="11"
									cy="12"
									r="1.5"
								/>
							</svg>
						</button>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-2 mt-3 border-t border-gray-100 pt-3">
						<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
							<label class="flex items-center gap-1 text-gray-600 cursor-pointer whitespace-nowrap">
								<input
									type="checkbox"
									:checked="menu.isVisible"
									class="rounded"
									@change="toggleVisible(menu, !menu.isVisible)"
								>
								表示
							</label>
							<label class="flex items-center gap-1 text-gray-600 cursor-pointer whitespace-nowrap">
								<input
									type="checkbox"
									:checked="menu.soldOut"
									class="rounded"
									@change="toggleSoldOut(menu, !menu.soldOut)"
								>
								売り切れ
							</label>
						</div>
						<div class="flex gap-2">
							<button
								class="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
								@click="openModal(menu)"
							>
								編集
							</button>
							<button
								class="text-xs text-red-600 hover:text-red-800 whitespace-nowrap"
								@click="removeMenu(menu)"
							>
								削除
							</button>
						</div>
					</div>
				</div>
			</VueDraggable>
		</div>

		<AdminMenuFormModal
			v-if="showModal"
			:menu="editingMenu"
			:groups="groups"
			:shop-id="shopId"
			:default-sort-order="defaultSortOrder"
			@close="closeModal"
			@saved="loadAll"
			@selected-group-change="onGroupChange"
		/>
	</div>
</template>

<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Menu, MenuGroup } from '~/types'
import { formatPrice } from '~/utils/format'
import { createSortOrder } from '~/utils/sortOrder'

definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const route = useRoute()
const shopId = String(route.params.shopId)

const { getMenuGroups, addMenuGroup, updateMenuGroup, deleteMenuGroup, getMenus, updateMenu, deleteMenu, reorderMenuGroups, reorderMenus } = useMenus()
const { deleteMenuImage } = useMenuImage()

const groups = ref<MenuGroup[]>([])
// menus はFirestoreから取得した全メニューのマスター配列
const menus = ref<Menu[]>([])
// menuLists はドラッグ操作用のグループ別配列
const menuLists = reactive<Record<string, Menu[]>>({})
const newGroupName = ref('')
const error = ref('')
const showModal = ref(false)
const editingMenu = ref<Menu | null>(null)
const modalGroupId = ref('')

// 並べ替え保存中の再入を防ぐため、保存中のメニューグループIDを保持する
const reorderingMenuGroupId = ref<string | null>(null)

function getMenuList(groupId: string): Menu[] {
	return menuLists[groupId] ?? []
}

function syncMenuLists() {
	const groupIds = new Set(groups.value.map(group => group.id))
	for (const group of groups.value) {
		menuLists[group.id] = menus.value
			.filter(menu => menu.menuGroupId === group.id)
			.sort((a, b) => a.sortOrder - b.sortOrder)
	}
	for (const key of Object.keys(menuLists)) {
		if (!groupIds.has(key)) {
			Reflect.deleteProperty(menuLists, key)
		}
	}
}

function onMenuUpdate(groupId: string, value: Menu[]) {
	if (
		reorderingMenuGroupId.value !== null
		&& reorderingMenuGroupId.value !== groupId
	) {
		return
	}
	menuLists[groupId] = value
}

const defaultSortOrder = computed(() => {
	const groupMenus = menus.value.filter(menu => menu.menuGroupId === modalGroupId.value)
	const max = groupMenus.reduce((m, menu) => Math.max(m, menu.sortOrder ?? 0), 0)
	return max + 10
})

let groupsBackup: MenuGroup[] = []
let menuSortBackup = new Map<string, number>()

onMounted(loadAll)

async function loadAll() {
	try {
		const [g, m] = await Promise.all([getMenuGroups(shopId), getMenus(shopId)])
		groups.value = g
		menus.value = m
		syncMenuLists()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
	}
}

async function addGroup() {
	const name = newGroupName.value.trim()
	if (!name) return
	try {
		const maxOrder = groups.value.reduce((max, g) => Math.max(max, g.sortOrder), 0)
		await addMenuGroup(shopId, name, maxOrder + 10)
		newGroupName.value = ''
		await loadAll()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : 'グループの追加に失敗しました'
	}
}

async function saveGroup(group: MenuGroup) {
	try {
		await updateMenuGroup(shopId, group.id, { name: group.name })
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : 'グループの保存に失敗しました'
	}
}

async function removeGroup(group: MenuGroup) {
	if (!confirm(`グループ「${group.name}」を削除しますか？`)) return
	try {
		await deleteMenuGroup(shopId, group.id)
		await loadAll()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '削除に失敗しました'
	}
}

function onGroupStart() {
	groupsBackup = groups.value.map(group => ({ ...group }))
}

async function onGroupEnd() {
	try {
		await reorderMenuGroups(shopId, groups.value)
		groups.value.forEach((group, i) => {
			group.sortOrder = createSortOrder(i)
		})
	}
	catch (e) {
		groups.value = groupsBackup
		error.value = e instanceof Error ? e.message : '並べ替えの保存に失敗しました'
	}
}

function onMenuStart(groupId: string) {
	if (reorderingMenuGroupId.value) return
	menuSortBackup = new Map()
	for (const menu of menus.value) {
		if (menu.menuGroupId === groupId) {
			menuSortBackup.set(menu.id, menu.sortOrder)
		}
	}
}

async function onMenuEnd(groupId: string) {
	if (reorderingMenuGroupId.value) return
	reorderingMenuGroupId.value = groupId
	const ordered = getMenuList(groupId)
	try {
		await reorderMenus(shopId, ordered)
		ordered.forEach((menu, i) => {
			menu.sortOrder = createSortOrder(i)
		})
	}
	catch (e) {
		for (const menu of menus.value) {
			const backup = menuSortBackup.get(menu.id)
			if (backup !== undefined) {
				menu.sortOrder = backup
			}
		}
		syncMenuLists()
		error.value = e instanceof Error ? e.message : '並べ替えの保存に失敗しました'
	}
	finally {
		reorderingMenuGroupId.value = null
	}
}

function openModal(menu: Menu | null) {
	editingMenu.value = menu
	modalGroupId.value = menu?.menuGroupId ?? ''
	showModal.value = true
}

function onGroupChange(groupId: string) {
	modalGroupId.value = groupId
}

function closeModal() {
	showModal.value = false
	editingMenu.value = null
}

async function toggleVisible(menu: Menu, value: boolean) {
	try {
		await updateMenu(shopId, menu.id, { isVisible: value })
		menu.isVisible = value
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '更新に失敗しました'
	}
}

async function toggleSoldOut(menu: Menu, value: boolean) {
	try {
		await updateMenu(shopId, menu.id, { soldOut: value })
		menu.soldOut = value
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '更新に失敗しました'
	}
}

async function removeMenu(menu: Menu) {
	if (!confirm(`「${menu.name}」を削除しますか？`)) return
	try {
		await deleteMenu(shopId, menu.id)
		if (menu.storagePath) {
			await deleteMenuImage(menu.storagePath).catch(() => {})
		}
		await loadAll()
	}
	catch (e) {
		error.value = e instanceof Error ? e.message : '削除に失敗しました'
	}
}
</script>
