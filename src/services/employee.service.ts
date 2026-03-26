const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
		departement_id?: string | { _id: string; name?: string };
	} | string;
	jobTitle?: string;
	experienceYears?: number;
	seniorityLevel?: "JUNIOR" | "MID" | "SENIOR";
};

export async function getAllEmployees(): Promise<EmployeeRecord[]> {
	const res = await fetch(`${BASE}/employee`, {
		method: "GET",
		headers: authHeaders(),
	});
	return handle(res);
}

export async function getEmployeesByDepartment(departmentId: string): Promise<EmployeeRecord[]> {
	const res = await fetch(`${BASE}/employee?departmentId=${encodeURIComponent(departmentId)}`, {
		method: "GET",
		headers: authHeaders(),
	});
	return handle(res);
}

export async function getEmployeeByUserId(userId: string): Promise<EmployeeRecord | null> {
	const employees = await getAllEmployees();
	return (
		employees.find((e) => typeof e.user_id === "object" && String(e.user_id?._id || "") === userId) ||
		null
	);
}

export async function patchEmployeeById(
	employeeId: string,
	payload: Partial<Pick<EmployeeRecord, "jobTitle" | "experienceYears" | "seniorityLevel">>
): Promise<EmployeeRecord> {
	const res = await fetch(`${BASE}/employee/${employeeId}`, {
		method: "PATCH",
		headers: authHeaders(),
		body: JSON.stringify(payload),
	});
	return handle(res);
}
