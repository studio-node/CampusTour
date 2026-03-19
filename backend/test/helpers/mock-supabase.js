function makeEqChain(state) {
  const chain = {
    eq(_column, value) {
      const key = state.currentTable;
      state.lastEqValueByTable.set(key, value);
      return chain;
    },
    neq() {
      return chain;
    },
    lt() {
      return chain;
    },
    in() {
      return chain;
    },
    select() {
      return chain;
    },
    single: async () => {
      const table = state.currentTable;
      const value = state.lastEqValueByTable.get(table);
      const tableMap = state.singleByTableAndEq.get(table) || new Map();
      if (!tableMap.has(value)) {
        return { data: null, error: { message: `No mock for ${table}:${value}` } };
      }
      return tableMap.get(value);
    },
    update(updatePayload) {
      state.lastUpdatePayload = updatePayload;
      return chain;
    },
    insert(insertPayload) {
      state.lastInsertPayload = insertPayload;
      return chain;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    },
  };
  return chain;
}

export function createSupabaseMock() {
  const state = {
    currentTable: null,
    lastEqValueByTable: new Map(),
    singleByTableAndEq: new Map(),
    lastUpdatePayload: null,
    lastInsertPayload: null,
  };

  return {
    state,
    setSingleResponse(table, eqValue, response) {
      if (!state.singleByTableAndEq.has(table)) {
        state.singleByTableAndEq.set(table, new Map());
      }
      state.singleByTableAndEq.get(table).set(eqValue, response);
    },
    from(table) {
      state.currentTable = table;
      return makeEqChain(state);
    },
  };
}
