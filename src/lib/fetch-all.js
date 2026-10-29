/**
 * Page through every matching record. Entity reads return one page at a time
 * ({ items, next_cursor, has_more }), so anything that needs a whole filtered
 * set walks the cursor instead of assuming the first page is everything.
 * `entityApi` is passed in so this works with the browser client, the caller's
 * client and the service-role client alike.
 */
export async function fetchAll(entityApi, query = {}, { pageSize = 2000, view } = {}) {
  const items = [];
  const visited = new Set();
  let cursor = null;
  do {
    if (visited.has(cursor)) throw new Error("The data source repeated a page cursor. The result is incomplete.");
    visited.add(cursor);
    const page = await entityApi.filter(query, { limit: pageSize, ...(view ? { view } : {}), ...(cursor ? { cursor } : {}) });
    const batch = page?.items ?? [];
    items.push(...batch);
    cursor = page?.has_more ? page.next_cursor : null;
    if (page?.has_more && !cursor) throw new Error("The data source did not provide the next page. The result is incomplete.");
  } while (cursor);
  return items;
}
