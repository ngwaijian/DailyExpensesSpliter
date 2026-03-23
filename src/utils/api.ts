export async function customFetch(url: string, options: RequestInit = {}) {
  // Add any custom logic, auth headers, or offline handling here if needed
  return fetch(url, options);
}
