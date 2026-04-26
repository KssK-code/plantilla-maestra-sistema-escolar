import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/** Evita mostrar placeholders tipo [NOMBRE_ESCUELA] desde BD; usa Vite en cliente. */
export function resolveSchoolDisplayName(schoolSettings) {
	const raw = typeof schoolSettings?.school_name === 'string' ? schoolSettings.school_name.trim() : '';
	if (!raw || /NOMBRE_ESCUELA|\[NOMBRE_ESCUELA\]/i.test(raw)) {
		return import.meta.env.VITE_SCHOOL_NAME || '';
	}
	return raw;
}

/** Ubicación o sucursal para encabezados y UI; prioriza Vite. */
export function resolveBranchDisplayLabel() {
	const v = import.meta.env.VITE_BRANCH_NAME;
	return typeof v === 'string' && v.trim() ? v.trim() : '';
}

export function getPublicLogoUrl() {
	return '/logo.png';
}