// Only the country code is returned; the app does not persist precise location or IP.
export default function region(
  _request: Request,
  context: { geo?: { country?: { code?: string } } },
): Response {
  const code = context.geo?.country?.code;
  const country = code === 'AR' || code === 'AU' ? code : null;
  return new Response(JSON.stringify({ country }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
}

export const config = { path: '/api/v1/region' };
