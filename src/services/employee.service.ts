import { getApiBaseUrl } from "../utils/apiBaseUrl";

const BASE = getApiBaseUrl();

function authHeaders() {
	const token = localStorage.getItem("token");
	return {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

async function handle(res: Response) {
	if (!res.ok) {
		const txt = await res.text();
		const message = txt || "Request failed";
		const err: Error & { status?: number } = new Error(message);
		err.status = res.status;
		throw err;
	}

	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

export type EmployeeRecord = {
	_id: string;
	user_id: {
		_id: string;
		name?: string;
		email?: string;
		role?: string;
		matricule?: string;
		departement_id?: { _id: string; name?: string } | null;
	} | string;
	jobTitle?: string;
	experienceYears?: number;
	seniorityLevel?: "JUNIOR" | "MID" | "SENIOR";
	experienceSegments?: ExperienceSegment[];
};

export type ExperienceSegment = {
	fromYear: number;
	toYear: number;
	domainIds: string[];
	skillIds: string[];
	company?: string;
};

function normalizeEmployeeRecord(raw: any): EmployeeRecord {
	const userRaw = typeof raw?.user_id === "object" && raw?.user_id ? raw.user_id : {};
	const depRaw = userRaw?.departement_id ?? userRaw?.department ?? userRaw?.departmentId ?? null;
	const dep =
		depRaw && typeof depRaw === "object"
			? {
					_id: String((depRaw as any)?._id || (depRaw as any)?.id || ""),
					name: (depRaw as any)?.name ? String((depRaw as any).name) : undefined,
			  }
			: depRaw
			? { _id: String(depRaw), name: undefined }
			: null;

	return {
		...raw,
		_id: String(raw?._id || ""),
		user_id: {
			_id: String(userRaw?._id || ""),
			name: userRaw?.name ? String(userRaw.name) : undefined,
			email: userRaw?.email ? String(userRaw.email) : undefined,
			role: userRaw?.role ? String(userRaw.role).toUpperCase() : undefined,
			matricule: userRaw?.matricule ? String(userRaw.matricule) : undefined,
			departement_id: dep,
		},
	};
}

export async function getAllEmployees(): Promise<EmployeeRecord[]> {
	const res = await fetch(`${BASE}/employee`, {
		method: "GET",
		headers: authHeaders(),
	});
	const data = await handle(res);
	const rows = Array.isArray(data) ? data : [];
	return rows.map(normalizeEmployeeRecord);
}

export async function getEmployeesByDepartment(departmentId: string): Promise<EmployeeRecord[]> {
	const res = await fetch(`${BASE}/employee?departmentId=${encodeURIComponent(departmentId)}`, {
		method: "GET",
		headers: authHeaders(),
	});
	const data = await handle(res);
	const rows = Array.isArray(data) ? data : [];
	return rows.map(normalizeEmployeeRecord);
}

export async function getEmployeeByUserId(userId: string): Promise<EmployeeRecord | null> {
	const employees = await getAllEmployees();
	return (
		employees.find((e) => typeof e.user_id === "object" && String(e.user_id?._id || "") === userId) ||
		null
	);
}

/** Current user's employee profile (EMPLOYEE role). */
export async function getMyEmployeeRecord(): Promise<EmployeeRecord> {
	const res = await fetch(`${BASE}/employee/me`, {
		method: "GET",
		headers: authHeaders(),
	});
	const data = await handle(res);
	return normalizeEmployeeRecord(data || {});
}

/** Update current user's employee profile (EMPLOYEE role). */
export async function patchMyEmployeeRecord(
	payload: Partial<
		Pick<EmployeeRecord, "jobTitle" | "experienceYears" | "seniorityLevel" | "experienceSegments">
	>,
): Promise<EmployeeRecord> {
	const res = await fetch(`${BASE}/employee/me`, {
		method: "PATCH",
		headers: authHeaders(),
		body: JSON.stringify(payload),
	});
	const data = await handle(res);
	return normalizeEmployeeRecord(data || {});
}

export async function patchEmployeeById(
	employeeId: string,
	payload: Partial<
		Pick<EmployeeRecord, "jobTitle" | "experienceYears" | "seniorityLevel" | "experienceSegments">
	>
): Promise<EmployeeRecord> {
	const res = await fetch(`${BASE}/employee/${employeeId}`, {
		method: "PATCH",
		headers: authHeaders(),
		body: JSON.stringify(payload),
	});
	const data = await handle(res);
	return normalizeEmployeeRecord(data || {});
}

export async function deleteEmployeeById(employeeId: string): Promise<void> {
	const res = await fetch(`${BASE}/employee/${employeeId}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
	await handle(res);
}
