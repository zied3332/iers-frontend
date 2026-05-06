// src/services/employee.service.spec.ts

const mockFetch = jest.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

import {
  deleteEmployeeById,
  getAllEmployees,
  getEmployeeByUserId,
  getEmployeesByDepartment,
  getMyEmployeeRecord,
  patchEmployeeById,
  patchMyEmployeeRecord,
} from "./employee.service";

function fakeJsonResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function fakeTextErrorResponse(message: string, status: number): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(message),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.setItem("token", "fake-jwt-token");
});

describe("employee.service", () => {
  it("getAllEmployees() should fetch and normalize employee records", async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse([
        {
          _id: "emp-1",
          user_id: {
            _id: "user-1",
            name: "Alice",
            email: "alice@test.com",
            role: "employee",
            matricule: "MAT-1",
            department: { _id: "dep-1", name: "Engineering" },
          },
        },
      ])
    );

    const rows = await getAllEmployees();

    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe("emp-1");
    expect((rows[0].user_id as any).role).toBe("EMPLOYEE");
    expect((rows[0].user_id as any).departement_id).toEqual({
      _id: "dep-1",
      name: "Engineering",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/employee",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-jwt-token",
        }),
      })
    );
  });

  it("getEmployeesByDepartment() should encode departmentId in query", async () => {
    mockFetch.mockResolvedValueOnce(fakeJsonResponse([]));

    await getEmployeesByDepartment("dep A/B");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/employee?departmentId=dep%20A%2FB",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("getEmployeeByUserId() should return matching employee or null", async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse([
        { _id: "emp-1", user_id: { _id: "user-1", name: "Alice" } },
        { _id: "emp-2", user_id: { _id: "user-2", name: "Bob" } },
      ])
    );

    const found = await getEmployeeByUserId("user-2");
    expect(found?._id).toBe("emp-2");

    mockFetch.mockResolvedValueOnce(fakeJsonResponse([{ _id: "emp-3", user_id: "user-3" }]));
    const missing = await getEmployeeByUserId("user-x");
    expect(missing).toBeNull();
  });

  it("getMyEmployeeRecord() should call /employee/me and normalize data", async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({
        _id: "emp-me",
        user_id: {
          _id: "u-me",
          name: "Me",
          role: "manager",
          departement_id: "dep-9",
        },
      })
    );

    const me = await getMyEmployeeRecord();

    expect(me._id).toBe("emp-me");
    expect((me.user_id as any).role).toBe("MANAGER");
    expect((me.user_id as any).departement_id).toEqual({ _id: "dep-9", name: undefined });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/employee/me",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("patch functions should send PATCH with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ _id: "emp-me", user_id: { _id: "u-me" }, jobTitle: "Senior Dev" })
    );
    mockFetch.mockResolvedValueOnce(
      fakeJsonResponse({ _id: "emp-10", user_id: { _id: "u-10" }, jobTitle: "Lead" })
    );

    await patchMyEmployeeRecord({ jobTitle: "Senior Dev" });
    await patchEmployeeById("emp-10", { jobTitle: "Lead" });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/employee/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ jobTitle: "Senior Dev" }),
      })
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/employee/emp-10",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ jobTitle: "Lead" }),
      })
    );
  });

  it("deleteEmployeeById() should throw Error with status on API failure", async () => {
    mockFetch.mockResolvedValueOnce(fakeTextErrorResponse("Forbidden", 403));

    await expect(deleteEmployeeById("emp-7")).rejects.toMatchObject({
      message: "Forbidden",
      status: 403,
    });
  });
});
