const API_BASE = import.meta.env.VITE_API_URL || "";

export type MeResponse = {
  id: string;
  role: "PRO" | string;
  name: string;
  email: string;
};

export async function loginRequest(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  // backend retorna: { access_token, token_type }
  if (!data?.access_token) throw new Error("Login não retornou access_token.");
  return { accessToken: data.access_token as string, tokenType: data.token_type as string };
}

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}