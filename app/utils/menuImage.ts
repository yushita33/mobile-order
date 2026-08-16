import type { Menu } from '~/types'

export function getMenuImageUrl(menu: Menu): string {
	return menu.imageUrl
		? menu.imageUrl + (menu.imageUpdatedAt ? `?v=${menu.imageUpdatedAt}` : '')
		: ''
}
