import type { FavoriteDTO } from '@memoarchitect/tools/browser';
import { sameFavorite, useModelStore } from '../store/model-store';

/** Whether this is one of the person's favorites. */
export function useIsFavorite(favorite: FavoriteDTO | null): boolean {
    return useModelStore(state => Boolean(favorite && state.favorites.some(entry => sameFavorite(entry, favorite))));
}

/** The words for adding or removing a favorite, for a menu. */
export function favoriteActionLabel(isFavorite: boolean): string {
    return isFavorite ? 'Remove from favorites' : 'Add to favorites';
}

/** A star that adds a favorite, or removes it. Stops the click so a row it sits in does not also open. */
export function FavoriteToggle({ favorite, size = 14 }: { favorite: FavoriteDTO; size?: number }) {
    const toggleFavorite = useModelStore(state => state.toggleFavorite);
    const isFavorite = useIsFavorite(favorite);
    const label = favoriteActionLabel(isFavorite);
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isFavorite}
            onClick={event => { event.stopPropagation(); toggleFavorite(favorite); }}
            style={{
                background: 'none', border: 0, padding: 2, cursor: 'pointer', lineHeight: 0,
                color: isFavorite ? '#D4A72C' : '#9CA3AF',
            }}
        >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
                fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
        </button>
    );
}
