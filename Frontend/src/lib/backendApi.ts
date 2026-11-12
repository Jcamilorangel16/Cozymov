export function getBackendApiConfig() {
	const baseUrl = process.env.VITE_API_URL?.replace(/\/+$/, "");
	const internalApiKey = process.env.INTERNAL_API_KEY;

	if (!baseUrl || !internalApiKey) {
		return null;
	}

	return {
		baseUrl,
		headers: { "X-Internal-Api-Key": internalApiKey },
	};
}
