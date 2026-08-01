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

			<ul class="space-y-2 mb-4">
				<li
					v-for="group in groups"
					:key="group.id"
					class="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
				>
					<div class="flex items-center gap-3">
						<input
							v-model="group.name"
							class="text-sm border border-transparent focus:border-gray-300 focus:outline-none rounded px-1 py-0.5"
							@change="saveGroup(group)"
						>
						<span class="text-xs text-gray-400">
							表示順: {{ group.sortOrder }}
						</span>
					</div>
					<button
						class="text-xs text-red-600 hover:text-red-800"
						@click="removeGroup(group)"
					>
						削除
					</button>
				</li>
			</ul>

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
					class="bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700 transition disabled:opacity-50"
					:disabled="!newGroupName.trim()"
				>
					追加
				</button>
			</form>
		</div>

		<div class="flex items-center justify-between mb-4">
			<h2 class="font-bold text-gray-800">
				メニュー一覧
			</h2>
			<button
				class="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition"
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
			v-for="group in groupsWithAll"
			:key="group.id"
			class="mb-6"
		>
			<h3 class="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">
				{{ group.name }}
			</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div
					v-for="menu in group.menus"
					:key="menu.id"
					class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
				>
					<div class="flex gap-3">
						<img
							v-if="menu.imageUrl"
							:src="menu.imageUrl + (menu.imageUpdatedAt ? `?v=${menu.imageUpdatedAt}` : '')"
							:alt="menu.name"
							class="w-20 h-20 object-cover rounded-lg"
						>
						<div
							v-else
							class="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs"
						>
							画像なし
						</div>
						<div class="flex-1">
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

					<div class="flex items-center justify-between mt-3 border-t border-gray-100 pt-3">
						<div class="flex gap-3 text-xs">
							<label class="flex items-center gap-1 text-gray-600 cursor-pointer">
								<input
									type="checkbox"
									:checked="menu.isVisible"
									class="rounded"
									@change="toggleVisible(menu, !menu.isVisible)"
								>
								表示
							</label>
							<label class="flex items-center gap-1 text-gray-600 cursor-pointer">
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
								class="text-xs text-blue-600 hover:text-blue-800"
								@click="openModal(menu)"
							>
								編集
							</button>
							<button
								class="text-xs text-red-600 hover:text-red-800"
								@click="removeMenu(menu)"
							>
								削除
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<MenuFormModal
			v-if="showModal"
			:menu="editingMenu"
			:groups="groups"
			:shop-id="shopId"
			@close="closeModal"
			@saved="loadAll"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Menu, MenuGroup } from '~/types'
import { formatPrice } from '~/utils/format'

definePageMeta({
	middleware: 'auth',
	layout: 'admin',
})

const route = useRoute()
const shopId = String(route.params.shopId)

const { getMenuGroups, addMenuGroup, updateMenuGroup, deleteMenuGroup, getMenus, updateMenu, deleteMenu } = useMenus()
const { deleteMenuImage } = useMenuImage()

const groups = ref<MenuGroup[]>([])
const menus = ref<Menu[]>([])
const newGroupName = ref('')
const error = ref('')
const showModal = ref(false)
const editingMenu = ref<Menu | null>(null)

const groupsWithAll = computed(() => {
	return groups.value.map(group => ({
		...group,
		menus: menus.value
			.filter(m => m.menuGroupId === group.id)
			.sort((a, b) => a.sortOrder - b.sortOrder),
	}))
})

onMounted(loadAll)

async function loadAll() {
	try {
		const [g, m] = await Promise.all([getMenuGroups(shopId), getMenus(shopId)])
		groups.value = g
		menus.value = m
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

function openModal(menu: Menu | null) {
	editingMenu.value = menu
	showModal.value = true
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
