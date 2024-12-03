import onResult from "@/router/accessRequestHandledCallback";

describe('accessRequestHandledCallback', () => {
  it('should memorize callback uri', async () => {
    const cache: Record<string, string> = {};
    const accessRequestUri = 'http://localhost:9999/url';

    expect(cache[accessRequestUri]).toBeUndefined();

    onResult(accessRequestUri, '1', cache);

    expect(cache[accessRequestUri]).toEqual('1');
  })
});